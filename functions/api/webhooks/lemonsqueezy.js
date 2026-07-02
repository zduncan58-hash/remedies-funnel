/**
 * POST /api/webhooks/lemonsqueezy
 * ────────────────────────────────
 * Receives Lemon Squeezy webhooks and stores purchase events in
 * TRACKING_KV using the SAME event format as /api/track — so sales
 * show up next to page views and CTA clicks with full attribution.
 *
 * SETUP (one time, ~3 minutes):
 *  1. Lemon Squeezy dashboard → Settings → Webhooks → "+"
 *     - Callback URL:  https://remedies.healvex.co/api/webhooks/lemonsqueezy
 *     - Signing secret: generate a long random string
 *     - Events: order_created  (optionally order_refunded)
 *  2. Cloudflare Pages → Settings → Environment variables:
 *     - LEMONSQUEEZY_WEBHOOK_SECRET = the same signing secret
 *  3. SALES PAGE CHANGE (for session/UTM attribution):
 *     Append the visitor's session id + utms to every checkout link:
 *       url.searchParams.set('checkout[custom][session_id]', sessionId);
 *       url.searchParams.set('checkout[custom][utm_source]', utmSource || '');
 *       url.searchParams.set('checkout[custom][utm_campaign]', utmCampaign || '');
 *     (Same place the page already sets checkout[custom][product].)
 *
 * KV binding expected: TRACKING_KV (same as track.js)
 */

export async function onRequestPost({ request, env }) {
  const rawBody = await request.text();

  // ── 1. Verify signature (HMAC-SHA256 of raw body, hex, in X-Signature) ──
  const signature = request.headers.get('x-signature') || '';
  const valid = await verifySignature(rawBody, signature, env.LEMONSQUEEZY_WEBHOOK_SECRET || '');
  if (!valid) {
    return json({ ok: false, error: 'invalid signature' }, 401);
  }

  // ── 2. Parse payload ──
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, error: 'bad json' }, 400);
  }

  const eventName = payload?.meta?.event_name || 'unknown';
  if (eventName !== 'order_created' && eventName !== 'order_refunded') {
    // Acknowledge everything else so LS doesn't retry
    return json({ ok: true, skipped: eventName });
  }

  const attr = payload?.data?.attributes || {};
  const custom = payload?.meta?.custom_data || {};

  // Amounts from LS are in cents
  const totalUsd = (attr.total_usd ?? attr.total ?? 0) / 100;
  const currency = attr.currency || 'USD';

  const event = {
    timestamp: attr.created_at || new Date().toISOString(),
    session_id: String(custom.session_id || '').slice(0, 64),
    event_type: eventName === 'order_refunded' ? 'refund' : 'purchase',
    device_type: '',
    utm_source: String(custom.utm_source || '').slice(0, 64),
    utm_medium: String(custom.utm_medium || '').slice(0, 64),
    utm_campaign: String(custom.utm_campaign || '').slice(0, 64),
    page: 'checkout',
    cta_location: '',
    href: '',
    country: String(attr.billing_address?.country || custom.country || '').slice(0, 8),
    reason: String(custom.product || 'remedies-notebook').slice(0, 32),
    dest: `order:${attr.order_number || payload?.data?.id || ''}`.slice(0, 200),
    message: `${eventName === 'order_refunded' ? '-' : ''}${totalUsd.toFixed(2)} ${currency} · ${String(attr.user_email || '').slice(0, 100)}`.slice(0, 200),
    _server_ts: new Date().toISOString(),
    _cf_country: null,
    _cf_city: null,
    _ip_hash: null,
    _referer: 'lemonsqueezy-webhook',
    _ua: ''
  };

  const ts = new Date().toISOString();
  const rnd = Math.random().toString(36).slice(2, 10);
  await env.TRACKING_KV.put(`event:${ts}:${rnd}`, '', {
    metadata: event,
    expirationTtl: 60 * 60 * 24 * 90
  });

  return json({ ok: true });
}

// ── HMAC verification (timing-safe) ──
async function verifySignature(rawBody, signatureHex, secret) {
  if (!secret || !signatureHex) return false;
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
    const expected = Array.from(new Uint8Array(mac))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    // timing-safe compare
    if (expected.length !== signatureHex.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ signatureHex.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
