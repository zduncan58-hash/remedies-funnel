/**
 * GET /api/dashboard/export?period=today|7d|30d|all
 * ────────────────────────────────────────────────────
 * Returns all events for the requested period as a CSV file download.
 * Auth-gated (same cookie as summary).
 *
 * Response is a text/csv attachment with a filename like:
 *   wei-remedies-7d-2026-07-01.csv
 */

const CSV_COLUMNS = [
  'timestamp',
  '_server_ts',
  'session_id',
  'event_type',
  'cta_location',
  'page',
  'device_type',
  'country',
  '_cf_country',
  '_cf_city',
  '_ip_hash',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  '_referer',
  '_ua',
  'href',
  'dest',
  'reason',
  'message'
];

export async function onRequestGet({ request, env }) {
  const auth = await requireAuth(request, env);
  if (auth !== true) return auth;

  const url = new URL(request.url);
  const period = (url.searchParams.get('period') || 'today').toLowerCase();

  const events = await loadEvents(env, period);
  const csv = eventsToCsv(events);

  const today = new Date().toISOString().slice(0, 10);
  const filename = `wei-remedies-${period}-${today}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store'
    }
  });
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

// ═══ LOAD ═══
async function loadEvents(env, period) {
  const now = new Date();
  let cutoffIso;
  if (period === 'today') {
    const d = new Date(now); d.setUTCHours(0,0,0,0);
    cutoffIso = d.toISOString();
  } else if (period === '7d') {
    cutoffIso = new Date(now.getTime() - 7 * 86400000).toISOString();
  } else if (period === '30d') {
    cutoffIso = new Date(now.getTime() - 30 * 86400000).toISOString();
  } else {
    cutoffIso = '2020-01-01T00:00:00.000Z';
  }

  const startKey = `event:${cutoffIso}`;
  const events = [];
  let cursor;
  const MAX_CALLS = 15;

  for (let calls = 0; calls < MAX_CALLS; calls++) {
    const list = await env.TRACKING_KV.list({ prefix: 'event:', cursor, limit: 1000 });
    for (const k of list.keys) {
      if (k.name < startKey) continue;
      if (k.metadata) events.push(k.metadata);
    }
    if (list.list_complete || !list.cursor) break;
    cursor = list.cursor;
  }

  // Sort chronologically for nicer CSV
  events.sort((a, b) => {
    const ta = a._server_ts || a.timestamp || '';
    const tb = b._server_ts || b.timestamp || '';
    return ta.localeCompare(tb);
  });

  return events;
}

// ═══ CSV ═══
function eventsToCsv(events) {
  const rows = [CSV_COLUMNS.join(',')];
  for (const e of events) {
    const row = CSV_COLUMNS.map(c => csvCell(e[c]));
    rows.push(row.join(','));
  }
  return rows.join('\n');
}

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  // Escape if contains comma, quote, or newline
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
