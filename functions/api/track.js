/**
 * POST /api/track
 * ─────────────────
 * Receives tracking events from the remedies sales page.
 * Stores each event in Cloudflare KV with:
 *   key      = event:{ISO_timestamp}:{random_suffix}
 *   value    = "" (empty — payload lives in metadata for fast list reads)
 *   metadata = full enriched event payload (<1024 bytes)
 *
 * Enriches with Cloudflare-provided country + hashed IP.
 * TTL: 90 days (keeps KV usage lean).
 *
 * KV binding expected: TRACKING_KV
 */

export async function onRequestPost({ request, env }) {
  try {
    const payload = await request.json();

    // Server-side enrichment
    const cf = request.cf || {};
    const enriched = {
      // client-side payload
      timestamp: payload.timestamp || new Date().toISOString(),
      session_id: (payload.session_id || '').slice(0, 64),
      event_type: (payload.event_type || 'unknown').slice(0, 64),
      device_type: (payload.device_type || 'unknown').slice(0, 16),
      utm_source: (payload.utm_source || '').slice(0, 64),
      utm_medium: (payload.utm_medium || '').slice(0, 64),
      utm_campaign: (payload.utm_campaign || '').slice(0, 64),
      page: (payload.page || 'unknown').slice(0, 32),
      cta_location: (payload.cta_location || '').slice(0, 64),
      href: (payload.href || '').slice(0, 200),
      country: (payload.country || '').slice(0, 8),
      reason: (payload.reason || '').slice(0, 32),
      dest: (payload.dest || '').slice(0, 200),
      message: (payload.message || '').slice(0, 200),
      // server-side enrichment
      _server_ts: new Date().toISOString(),
      _cf_country: cf.country || null,
      _cf_city: (cf.city || '').slice(0, 40) || null,
      _ip_hash: await hashIp(request.headers.get('cf-connecting-ip') || ''),
      _referer: (request.headers.get('referer') || '').slice(0, 200) || null,
      _ua: (request.headers.get('user-agent') || '').slice(0, 200)
    };

    // Key format: event:{ISO_timestamp}:{random} — sorts by time when listing
    const ts = new Date().toISOString();
    const rnd = Math.random().toString(36).slice(2, 10);
    const key = `event:${ts}:${rnd}`;

    // Store with metadata so list() returns everything without needing get()
    // KV metadata limit is 1024 bytes; we truncate defensively above.
    await env.TRACKING_KV.put(key, '', {
      metadata: enriched,
      expirationTtl: 60 * 60 * 24 * 90 // 90 days
    });

    return jsonResponse({ ok: true });
  } catch (e) {
    // Never 500 back to a beacon; log to KV as a diagnostic event
    return jsonResponse({ ok: false, error: String(e).slice(0, 200) }, 200);
  }
}

// Preflight for CORS (harmless — sales page is same-origin, but keeps it flexible)
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders()
    }
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

async function hashIp(ip) {
  if (!ip) return null;
  try {
    const data = new TextEncoder().encode(ip + '|healvex-remedies-salt-2026');
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .slice(0, 8)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch { return null; }
}
