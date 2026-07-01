/**
 * GET /api/dashboard/summary?period=today|7d|30d|all
 * ────────────────────────────────────────────────────
 * Returns aggregated KPIs for the remedies funnel:
 *   - sessions_count (unique session_ids)
 *   - page_views
 *   - cta_clicks
 *   - cta_click_rate (page_views → cta_clicks)
 *   - by_cta_location (sorted, counts + %)
 *   - by_utm_source (sorted, counts + %)
 *   - by_country (sorted, counts + %)
 *   - by_device (mobile/desktop/tablet)
 *   - hourly (24-hour heatmap)
 *   - daily (14-day trend)
 *   - recent_sessions (last 25)
 *   - period, event_count, generated_at
 */

export async function onRequestGet({ request, env }) {
  const auth = await requireAuth(request, env);
  if (auth !== true) return auth;

  const url = new URL(request.url);
  const period = (url.searchParams.get('period') || 'today').toLowerCase();

  const events = await loadEvents(env, period);
  const summary = aggregate(events, period);

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
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

// ═══ LOAD EVENTS ═══
async function loadEvents(env, period) {
  // Compute cutoff ISO timestamp
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
    cutoffIso = '2020-01-01T00:00:00.000Z'; // 'all'
  }

  // KV list prefix — start from the cutoff timestamp so we skip older keys.
  // Keys sort lexicographically; ISO timestamps do too.
  const startKey = `event:${cutoffIso}`;

  const events = [];
  let cursor = undefined;
  let calls = 0;
  const MAX_CALLS = 15; // safety: 15 x 1000 = 15k events max per query

  while (calls < MAX_CALLS) {
    const list = await env.TRACKING_KV.list({
      prefix: 'event:',
      cursor,
      limit: 1000
    });
    calls++;

    for (const k of list.keys) {
      // Fast prefix check — skip anything older than cutoff
      if (k.name < startKey) continue;
      if (k.metadata) events.push(k.metadata);
    }

    if (list.list_complete || !list.cursor) break;
    cursor = list.cursor;
  }

  return events;
}

// ═══ AGGREGATE ═══
function aggregate(events, period) {
  const sessions = new Set();
  let page_views = 0;
  let cta_clicks = 0;
  let cta_fallbacks = 0;
  let checkout_prefills = 0;
  let js_errors = 0;

  const byCta = {};
  const byUtm = {};
  const byCountry = {};
  const byDevice = {};
  const hourly = new Array(24).fill(0);
  const dailyMap = {};

  const sessionsMap = {}; // for recent_sessions list

  for (const e of events) {
    if (!e || !e.session_id) continue;
    sessions.add(e.session_id);

    // Event-type counters
    if (e.event_type === 'remedies_page_view') page_views++;
    else if (e.event_type === 'remedies_cta_clicked') cta_clicks++;
    else if (e.event_type === 'remedies_cta_fallback_used') cta_fallbacks++;
    else if (e.event_type === 'checkout_country_prefilled') checkout_prefills++;
    else if (e.event_type === 'js_error') js_errors++;

    // CTA position
    if (e.event_type === 'remedies_cta_clicked' && e.cta_location) {
      byCta[e.cta_location] = (byCta[e.cta_location] || 0) + 1;
    }

    // UTM source (session-level would be better; for simplicity use event-level)
    const src = e.utm_source || '(direct)';
    byUtm[src] = (byUtm[src] || 0) + 1;

    // Country — prefer server-side CF, fallback to client-side pre-fill
    const c = e._cf_country || e.country || '??';
    byCountry[c] = (byCountry[c] || 0) + 1;

    // Device
    const d = e.device_type || 'unknown';
    byDevice[d] = (byDevice[d] || 0) + 1;

    // Hourly heatmap (server timestamp, UTC hour — TODO: user-local later)
    const ts = e._server_ts || e.timestamp;
    if (ts) {
      const dt = new Date(ts);
      const hour = dt.getUTCHours();
      if (!isNaN(hour)) hourly[hour]++;

      // Daily bucket YYYY-MM-DD (UTC)
      const day = ts.slice(0, 10);
      dailyMap[day] = (dailyMap[day] || 0) + 1;
    }

    // Session grouping for recent-sessions view
    if (!sessionsMap[e.session_id]) {
      sessionsMap[e.session_id] = {
        session_id: e.session_id,
        first_ts: ts,
        last_ts: ts,
        events: 0,
        cta_clicks: 0,
        country: e._cf_country || e.country || null,
        device: e.device_type || null,
        utm_source: e.utm_source || null,
        utm_campaign: e.utm_campaign || null
      };
    }
    const s = sessionsMap[e.session_id];
    s.events++;
    if (e.event_type === 'remedies_cta_clicked') s.cta_clicks++;
    if (ts && ts > s.last_ts) s.last_ts = ts;
    if (ts && ts < s.first_ts) s.first_ts = ts;
  }

  // Sort utility
  const toSortedArr = (obj) => Object.entries(obj)
    .map(([k, v]) => ({ key: k, count: v, pct: 0 }))
    .sort((a, b) => b.count - a.count);

  const applyPct = (arr, total) => {
    for (const row of arr) row.pct = total > 0 ? +(row.count / total * 100).toFixed(1) : 0;
    return arr;
  };

  const totalEvents = events.length;

  // Daily trend — last 14 days regardless of period (for the mini-chart)
  const dailyArr = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    dailyArr.push({ date: key, count: dailyMap[key] || 0 });
  }

  // Recent sessions — most recent 25
  const recentSessions = Object.values(sessionsMap)
    .sort((a, b) => (b.last_ts || '').localeCompare(a.last_ts || ''))
    .slice(0, 25);

  return {
    period,
    event_count: totalEvents,
    generated_at: new Date().toISOString(),

    // Funnel
    sessions_count: sessions.size,
    page_views,
    cta_clicks,
    cta_fallbacks,
    checkout_prefills,
    js_errors,
    cta_click_rate: page_views > 0 ? +(cta_clicks / page_views * 100).toFixed(1) : 0,
    ctas_per_session: sessions.size > 0 ? +(cta_clicks / sessions.size).toFixed(2) : 0,

    // Breakdowns
    by_cta_location: applyPct(toSortedArr(byCta), cta_clicks),
    by_utm_source:   applyPct(toSortedArr(byUtm), totalEvents),
    by_country:      applyPct(toSortedArr(byCountry), totalEvents),
    by_device:       applyPct(toSortedArr(byDevice), totalEvents),

    // Time series
    hourly,             // [count_0h, count_1h, ..., count_23h] UTC
    daily: dailyArr,    // last 14 days

    // Recent sessions list
    recent_sessions: recentSessions
  };
}
