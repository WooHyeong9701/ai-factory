// ── AI Factory — Cloudflare Worker API ───────────────────────────────────────
// Handles workflow CRUD via Cloudflare D1 (SQLite) + Clerk JWT auth + Admin analytics

import { createRemoteJWKSet, jwtVerify } from 'jose'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

function err(msg, status = 400) {
  return json({ error: msg }, status)
}

function randomId() {
  return crypto.randomUUID()
}

// ── JWT verification ─────────────────────────────────────────────────────────
let _jwks = null

async function verifyAuth(request, env) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  const clerkDomain = env.CLERK_DOMAIN
  if (!clerkDomain) return null

  if (!_jwks) {
    _jwks = createRemoteJWKSet(new URL(`https://${clerkDomain}/.well-known/jwks.json`))
  }

  try {
    const { payload } = await jwtVerify(token, _jwks)
    return payload.sub
  } catch {
    return null
  }
}

function isAdmin(userId, env) {
  return env.ADMIN_USER_ID && userId === env.ADMIN_USER_ID
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(ts) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// ── Main handler ─────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url    = new URL(request.url)
    const path   = url.pathname
    const method = request.method

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS })
    }

    // ── Public: POST /api/track (no auth needed) ─────────────────────────────
    if (method === 'POST' && path === '/api/track') {
      let body
      try { body = await request.json() } catch { body = {} }
      const visitorId = body.visitor_id || 'anonymous'
      const userId    = body.user_id    || ''
      const visitPath = body.path       || '/'
      const now       = Date.now()
      await env.DB.prepare(
        'INSERT INTO visits (visitor_id, user_id, path, created_at) VALUES (?, ?, ?, ?)'
      ).bind(visitorId, userId, visitPath, now).run()
      return json({ ok: true })
    }

    // ── Authenticate (required for all routes below) ─────────────────────────
    const userId = await verifyAuth(request, env)
    if (!userId) return err('로그인이 필요합니다', 401)

    // ── Admin: GET /api/admin/stats ──────────────────────────────────────────
    if (method === 'GET' && path === '/api/admin/stats') {
      if (!isAdmin(userId, env)) return err('관리자 권한이 필요합니다', 403)

      const now   = Date.now()
      const today = startOfDay(now)
      const weekAgo  = today - 7  * 86400000
      const monthAgo = today - 30 * 86400000

      // Run queries in parallel
      const [todayR, weekR, monthR, totalR, workflowR, usersR, dailyR, recentR] = await Promise.all([
        // Today unique visitors
        env.DB.prepare(
          'SELECT COUNT(DISTINCT visitor_id) as cnt FROM visits WHERE created_at >= ?'
        ).bind(today).first(),
        // Week unique visitors
        env.DB.prepare(
          'SELECT COUNT(DISTINCT visitor_id) as cnt FROM visits WHERE created_at >= ?'
        ).bind(weekAgo).first(),
        // Month unique visitors
        env.DB.prepare(
          'SELECT COUNT(DISTINCT visitor_id) as cnt FROM visits WHERE created_at >= ?'
        ).bind(monthAgo).first(),
        // Total visits
        env.DB.prepare('SELECT COUNT(*) as cnt FROM visits').first(),
        // Total workflows
        env.DB.prepare('SELECT COUNT(*) as cnt FROM workflows').first(),
        // Total unique users
        env.DB.prepare('SELECT COUNT(DISTINCT user_id) as cnt FROM workflows WHERE user_id != ""').first(),
        // Daily visitors for last 30 days (for chart)
        env.DB.prepare(`
          SELECT
            CAST((created_at / 86400000) AS INTEGER) as day_bucket,
            COUNT(DISTINCT visitor_id) as visitors,
            COUNT(*) as page_views
          FROM visits
          WHERE created_at >= ?
          GROUP BY day_bucket
          ORDER BY day_bucket ASC
        `).bind(monthAgo).all(),
        // Recent 20 visits
        env.DB.prepare(
          'SELECT visitor_id, user_id, path, created_at FROM visits ORDER BY created_at DESC LIMIT 20'
        ).all(),
      ])

      return json({
        today_visitors:  todayR?.cnt || 0,
        week_visitors:   weekR?.cnt  || 0,
        month_visitors:  monthR?.cnt || 0,
        total_visits:    totalR?.cnt || 0,
        total_workflows: workflowR?.cnt || 0,
        total_users:     usersR?.cnt || 0,
        daily_chart:     (dailyR?.results || []).map(r => ({
          date:       new Date(r.day_bucket * 86400000).toISOString().slice(0, 10),
          visitors:   r.visitors,
          page_views: r.page_views,
        })),
        recent_visits: (recentR?.results || []).map(r => ({
          visitor_id: r.visitor_id.slice(0, 8) + '...',
          user_id:    r.user_id ? r.user_id.slice(0, 10) + '...' : '',
          path:       r.path,
          time:       r.created_at,
        })),
      })
    }

    // ── Workflow CRUD (authenticated) ────────────────────────────────────────

    if (method === 'GET' && path === '/api/workflows') {
      const { results } = await env.DB.prepare(
        `SELECT id, name, thumbnail, created_at, updated_at
         FROM workflows WHERE user_id = ?
         ORDER BY updated_at DESC LIMIT 100`
      ).bind(userId).all()
      return json({ workflows: results })
    }

    const matchGet = path.match(/^\/api\/workflows\/([^/]+)$/)
    if (method === 'GET' && matchGet) {
      const id  = matchGet[1]
      const row = await env.DB.prepare(
        'SELECT * FROM workflows WHERE id = ? AND user_id = ?'
      ).bind(id, userId).first()
      if (!row) return err('워크플로우를 찾을 수 없습니다', 404)
      return json({ ...row, nodes: JSON.parse(row.nodes), edges: JSON.parse(row.edges) })
    }

    if (method === 'POST' && path === '/api/workflows') {
      let body
      try { body = await request.json() } catch { return err('JSON 파싱 오류') }
      const id  = randomId()
      const now = Date.now()
      await env.DB.prepare(
        `INSERT INTO workflows (id, user_id, name, thumbnail, nodes, edges, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(id, userId, body.name || '새 워크플로우', body.thumbnail || '',
        JSON.stringify(body.nodes || []), JSON.stringify(body.edges || []), now, now
      ).run()
      return json({ id, name: body.name, created_at: now, updated_at: now }, 201)
    }

    const matchPut = path.match(/^\/api\/workflows\/([^/]+)$/)
    if (method === 'PUT' && matchPut) {
      const id = matchPut[1]
      let body
      try { body = await request.json() } catch { return err('JSON 파싱 오류') }
      const existing = await env.DB.prepare(
        'SELECT id FROM workflows WHERE id = ? AND user_id = ?'
      ).bind(id, userId).first()
      if (!existing) return err('워크플로우를 찾을 수 없습니다', 404)
      const now = Date.now()
      await env.DB.prepare(
        `UPDATE workflows SET name = ?, thumbnail = ?, nodes = ?, edges = ?, updated_at = ?
         WHERE id = ? AND user_id = ?`
      ).bind(body.name || '새 워크플로우', body.thumbnail || '',
        JSON.stringify(body.nodes || []), JSON.stringify(body.edges || []), now, id, userId
      ).run()
      return json({ id, name: body.name, updated_at: now })
    }

    const matchDel = path.match(/^\/api\/workflows\/([^/]+)$/)
    if (method === 'DELETE' && matchDel) {
      const id = matchDel[1]
      await env.DB.prepare(
        'DELETE FROM workflows WHERE id = ? AND user_id = ?'
      ).bind(id, userId).run()
      return json({ deleted: id })
    }

    return err('Not found', 404)
  },
}
