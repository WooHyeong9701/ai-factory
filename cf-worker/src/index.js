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

    // ── Authenticate ──────────────────────────────────────────────────────────
    const userId = await verifyAuth(request, env)

    // ── Marketplace (public browse, auth for actions) ─────────────────────

    // Browse marketplace (no auth required for viewing)
    if (method === 'GET' && path === '/api/marketplace') {
      const sort     = url.searchParams.get('sort') || 'popular' // popular | recent | most_forked
      const category = url.searchParams.get('category') || ''
      const search   = url.searchParams.get('q') || ''
      const page     = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
      const limit    = 20
      const offset   = (page - 1) * limit

      let where = []
      let params = []

      if (category && category !== 'all') {
        where.push('category = ?')
        params.push(category)
      }
      if (search) {
        where.push('(name LIKE ? OR description LIKE ? OR tags LIKE ?)')
        const q = `%${search}%`
        params.push(q, q, q)
      }

      const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : ''
      const orderBy = sort === 'recent' ? 'created_at DESC'
                     : sort === 'most_forked' ? 'fork_count DESC, created_at DESC'
                     : 'like_count DESC, created_at DESC'

      const countQ = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM shared_workflows ${whereClause}`
      ).bind(...params).first()

      const { results } = await env.DB.prepare(
        `SELECT id, user_id, user_name, user_avatar, name, description, category, tags,
                node_count, like_count, fork_count, view_count, created_at, updated_at
         FROM shared_workflows ${whereClause}
         ORDER BY ${orderBy} LIMIT ? OFFSET ?`
      ).bind(...params, limit, offset).all()

      // If authenticated, attach user's like status
      let likedSet = new Set()
      if (userId) {
        const ids = results.map(r => r.id)
        if (ids.length) {
          const placeholders = ids.map(() => '?').join(',')
          const { results: likeRows } = await env.DB.prepare(
            `SELECT workflow_id FROM likes WHERE user_id = ? AND workflow_id IN (${placeholders})`
          ).bind(userId, ...ids).all()
          likedSet = new Set((likeRows || []).map(r => r.workflow_id))
        }
      }

      return json({
        workflows: (results || []).map(r => ({
          ...r,
          tags: JSON.parse(r.tags || '[]'),
          liked: likedSet.has(r.id),
        })),
        total: countQ?.cnt || 0,
        page,
        pages: Math.ceil((countQ?.cnt || 0) / limit),
      })
    }

    // Get single shared workflow detail
    const matchMarketGet = path.match(/^\/api\/marketplace\/([^/]+)$/)
    if (method === 'GET' && matchMarketGet) {
      const id = matchMarketGet[1]
      const row = await env.DB.prepare(
        'SELECT * FROM shared_workflows WHERE id = ?'
      ).bind(id).first()
      if (!row) return err('공유 워크플로우를 찾을 수 없습니다', 404)

      // Increment view count
      await env.DB.prepare(
        'UPDATE shared_workflows SET view_count = view_count + 1 WHERE id = ?'
      ).bind(id).run()

      let liked = false
      if (userId) {
        const likeRow = await env.DB.prepare(
          'SELECT 1 FROM likes WHERE user_id = ? AND workflow_id = ?'
        ).bind(userId, id).first()
        liked = !!likeRow
      }

      return json({
        ...row,
        nodes: JSON.parse(row.nodes),
        edges: JSON.parse(row.edges),
        tags: JSON.parse(row.tags || '[]'),
        liked,
        view_count: (row.view_count || 0) + 1,
      })
    }

    // ── Auth required for all routes below ────────────────────────────────
    if (!userId) return err('로그인이 필요합니다', 401)

    // ── Admin: GET /api/admin/stats ──────────────────────────────────────────
    if (method === 'GET' && path === '/api/admin/stats') {
      if (!isAdmin(userId, env)) return err('관리자 권한이 필요합니다', 403)

      const now   = Date.now()
      const today = startOfDay(now)
      const weekAgo  = today - 7  * 86400000
      const monthAgo = today - 30 * 86400000

      const [todayR, weekR, monthR, totalR, workflowR, usersR, dailyR, recentR] = await Promise.all([
        env.DB.prepare('SELECT COUNT(DISTINCT visitor_id) as cnt FROM visits WHERE created_at >= ?').bind(today).first(),
        env.DB.prepare('SELECT COUNT(DISTINCT visitor_id) as cnt FROM visits WHERE created_at >= ?').bind(weekAgo).first(),
        env.DB.prepare('SELECT COUNT(DISTINCT visitor_id) as cnt FROM visits WHERE created_at >= ?').bind(monthAgo).first(),
        env.DB.prepare('SELECT COUNT(*) as cnt FROM visits').first(),
        env.DB.prepare('SELECT COUNT(*) as cnt FROM workflows').first(),
        env.DB.prepare('SELECT COUNT(DISTINCT user_id) as cnt FROM workflows WHERE user_id != ""').first(),
        env.DB.prepare(`
          SELECT CAST((created_at / 86400000) AS INTEGER) as day_bucket,
                 COUNT(DISTINCT visitor_id) as visitors, COUNT(*) as page_views
          FROM visits WHERE created_at >= ? GROUP BY day_bucket ORDER BY day_bucket ASC
        `).bind(monthAgo).all(),
        env.DB.prepare('SELECT visitor_id, user_id, path, created_at FROM visits ORDER BY created_at DESC LIMIT 20').all(),
      ])

      return json({
        today_visitors: todayR?.cnt || 0, week_visitors: weekR?.cnt || 0,
        month_visitors: monthR?.cnt || 0, total_visits: totalR?.cnt || 0,
        total_workflows: workflowR?.cnt || 0, total_users: usersR?.cnt || 0,
        daily_chart: (dailyR?.results || []).map(r => ({
          date: new Date(r.day_bucket * 86400000).toISOString().slice(0, 10),
          visitors: r.visitors, page_views: r.page_views,
        })),
        recent_visits: (recentR?.results || []).map(r => ({
          visitor_id: r.visitor_id.slice(0, 8) + '...', user_id: r.user_id ? r.user_id.slice(0, 10) + '...' : '',
          path: r.path, time: r.created_at,
        })),
      })
    }

    // ── Marketplace actions (auth required) ─────────────────────────────────

    // Publish workflow to marketplace
    if (method === 'POST' && path === '/api/marketplace') {
      if (!userId) return err('로그인이 필요합니다', 401)
      let body
      try { body = await request.json() } catch { return err('JSON 파싱 오류') }

      const id  = randomId()
      const now = Date.now()
      const nodeCount = Array.isArray(body.nodes) ? body.nodes.length : 0

      await env.DB.prepare(
        `INSERT INTO shared_workflows
         (id, user_id, user_name, user_avatar, workflow_id, name, description, category, tags, node_count, nodes, edges, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id, userId,
        body.user_name || '',
        body.user_avatar || '',
        body.workflow_id || '',
        body.name || 'Untitled Workflow',
        body.description || '',
        body.category || 'general',
        JSON.stringify(body.tags || []),
        nodeCount,
        JSON.stringify(body.nodes || []),
        JSON.stringify(body.edges || []),
        now, now
      ).run()

      return json({ id, name: body.name, created_at: now }, 201)
    }

    // Update shared workflow
    const matchMarketPut = path.match(/^\/api\/marketplace\/([^/]+)$/)
    if (method === 'PUT' && matchMarketPut) {
      if (!userId) return err('로그인이 필요합니다', 401)
      const id = matchMarketPut[1]
      const existing = await env.DB.prepare(
        'SELECT id FROM shared_workflows WHERE id = ? AND user_id = ?'
      ).bind(id, userId).first()
      if (!existing) return err('권한이 없거나 존재하지 않습니다', 404)

      let body
      try { body = await request.json() } catch { return err('JSON 파싱 오류') }
      const now = Date.now()
      const nodeCount = Array.isArray(body.nodes) ? body.nodes.length : 0

      await env.DB.prepare(
        `UPDATE shared_workflows SET name = ?, description = ?, category = ?, tags = ?,
         node_count = ?, nodes = ?, edges = ?, updated_at = ?
         WHERE id = ? AND user_id = ?`
      ).bind(
        body.name || 'Untitled', body.description || '',
        body.category || 'general', JSON.stringify(body.tags || []),
        nodeCount, JSON.stringify(body.nodes || []), JSON.stringify(body.edges || []),
        now, id, userId
      ).run()

      return json({ id, updated_at: now })
    }

    // Delete shared workflow
    const matchMarketDel = path.match(/^\/api\/marketplace\/([^/]+)$/)
    if (method === 'DELETE' && matchMarketDel) {
      if (!userId) return err('로그인이 필요합니다', 401)
      const id = matchMarketDel[1]
      // Only owner or admin can delete
      const existing = await env.DB.prepare(
        'SELECT user_id FROM shared_workflows WHERE id = ?'
      ).bind(id).first()
      if (!existing) return err('존재하지 않습니다', 404)
      if (existing.user_id !== userId && !isAdmin(userId, env)) {
        return err('권한이 없습니다', 403)
      }
      await env.DB.prepare('DELETE FROM shared_workflows WHERE id = ?').bind(id).run()
      await env.DB.prepare('DELETE FROM likes WHERE workflow_id = ?').bind(id).run()
      return json({ deleted: id })
    }

    // Toggle like
    if (method === 'POST' && path === '/api/marketplace/like') {
      if (!userId) return err('로그인이 필요합니다', 401)
      let body
      try { body = await request.json() } catch { return err('JSON 파싱 오류') }
      const wfId = body.workflow_id
      if (!wfId) return err('workflow_id 필요')

      const existing = await env.DB.prepare(
        'SELECT 1 FROM likes WHERE user_id = ? AND workflow_id = ?'
      ).bind(userId, wfId).first()

      if (existing) {
        await env.DB.prepare('DELETE FROM likes WHERE user_id = ? AND workflow_id = ?').bind(userId, wfId).run()
        await env.DB.prepare('UPDATE shared_workflows SET like_count = MAX(0, like_count - 1) WHERE id = ?').bind(wfId).run()
        return json({ liked: false })
      } else {
        await env.DB.prepare('INSERT INTO likes (user_id, workflow_id, created_at) VALUES (?, ?, ?)').bind(userId, wfId, Date.now()).run()
        await env.DB.prepare('UPDATE shared_workflows SET like_count = like_count + 1 WHERE id = ?').bind(wfId).run()
        return json({ liked: true })
      }
    }

    // Fork (import) — increment fork count
    if (method === 'POST' && path === '/api/marketplace/fork') {
      if (!userId) return err('로그인이 필요합니다', 401)
      let body
      try { body = await request.json() } catch { return err('JSON 파싱 오류') }
      const wfId = body.workflow_id
      if (!wfId) return err('workflow_id 필요')

      await env.DB.prepare(
        'UPDATE shared_workflows SET fork_count = fork_count + 1 WHERE id = ?'
      ).bind(wfId).run()

      return json({ forked: true })
    }

    // My shared workflows
    if (method === 'GET' && path === '/api/marketplace/mine') {
      if (!userId) return err('로그인이 필요합니다', 401)
      const { results } = await env.DB.prepare(
        `SELECT id, name, description, category, tags, node_count, like_count, fork_count, view_count, created_at, updated_at
         FROM shared_workflows WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50`
      ).bind(userId).all()
      return json({
        workflows: (results || []).map(r => ({ ...r, tags: JSON.parse(r.tags || '[]') }))
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
