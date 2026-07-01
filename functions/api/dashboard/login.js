/**
 * POST /api/dashboard/login  { password }
 * Verifies against env.DASHBOARD_PASSWORD, sets HttpOnly cookie for 7 days.
 */

export async function onRequestPost({ request, env }) {
  try {
    const { password } = await request.json();

    if (!env.DASHBOARD_PASSWORD) {
      return json({ ok: false, error: 'DASHBOARD_PASSWORD not configured' }, 500);
    }
    if (!password || password !== env.DASHBOARD_PASSWORD) {
      // Small delay to blunt brute force
      await new Promise(r => setTimeout(r, 400));
      return json({ ok: false, error: 'Invalid password' }, 401);
    }

    const token = await signToken(env.DASHBOARD_PASSWORD);
    const maxAge = 60 * 60 * 24 * 7; // 7 days
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `hv_dash=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`
      }
    });
  } catch (e) {
    return json({ ok: false, error: String(e).slice(0, 200) }, 500);
  }
}

export async function onRequestGet() {
  return json({ ok: false, error: 'POST only' }, 405);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' }
  });
}

async function signToken(secret) {
  // Simple HMAC-ish token: sha256(secret + fixed salt). Not a JWT, just proves
  // the requester knew the password when the cookie was set. Cookie is HttpOnly + Secure.
  const data = new TextEncoder().encode(secret + '|hv-remedies-dash-v1');
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
