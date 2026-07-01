/** POST /api/dashboard/logout — clears the auth cookie */
export async function onRequestPost() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'hv_dash=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict'
    }
  });
}
