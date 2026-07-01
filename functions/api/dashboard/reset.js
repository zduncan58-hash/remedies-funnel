/**
 * POST /api/dashboard/reset
 * ──────────────────────────
 * Deletes ALL tracking events from the KV namespace.
 * Auth-gated (same cookie as summary). Destructive — the dashboard should
 * gate this behind a confirm dialog on the client side.
 *
 * Returns: { ok: true, deleted: N }
 */

export async function onRequestPost({ request, env }) {
  const auth = await requireAuth(request, env);
  if (auth !== true) return auth;

  let deleted = 0;
  let cursor = undefined;
  const MAX_CALLS = 30; // safety: 30 x 1000 = 30k events per reset call

  try {
    for (let calls = 0; calls < MAX_CALLS; calls++) {
      const list = await env.TRACKING_KV.list({
        prefix: 'event:',
        cursor,
        limit: 1000
      });

      // Delete each key in parallel batches
      const deletePromises = list.keys.map(k => env.TRACKING_KV.delete(k.name));
      await Promise.all(deletePromises);
      deleted += list.keys.length;

      if (list.list_complete || !list.cursor) break;
      cursor = list.cursor;
    }

    return json({ ok: true, deleted });
  } catch (e) {
    return json({ ok: false, error: String(e).slice(0, 200), deleted }, 500);
  }
}

export async function onRequestGet() {
  return json({ ok: false, error: 'POST only — this is destructive' }, 405);
}

// ═══ AUTH ═══
async function requireAuth(request, env) {
  const cookie = request.headers.get('cookie') || '';
  const m = cookie.match(/hv_dash=([a-f0-9]{64})/);
  if (!m) return json({ ok: false, error: 'Not authenticated' }, 401);

  const expected = await signToken(env.DASHBOARD_PASSWORD || '');
  if (m[1] !== expected) return json({ ok: false, error: 'Invalid session' }, 401);
  return true;
}

async function signToken(secret) {
  const data = new TextEncoder().encode(secret + '|hv-remedies-dash-v1');
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' }
  });
}
