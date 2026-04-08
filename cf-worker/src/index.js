// ── AI Factory — Cloudflare Worker API ───────────────────────────────────────
// Handles workflow CRUD via Cloudflare D1 (SQLite)

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
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

export default {
  async fetch(request, env) {
    const url    = new URL(request.url)
    const path   = url.pathname
    const method = request.method

    // ── CORS preflight ───────────────────────────────────────────────────────
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS })
    }

    // ── Route: GET /api/workflows ────────────────────────────────────────────
    if (method === 'GET' && path === '/api/workflows') {
      const { results } = await env.DB.prepare(
        `SELECT id, name, thumbnail, created_at, updated_at
         FROM workflows
         ORDER BY updated_at DESC
         LIMIT 100`
      ).all()
      return json({ workflows: results })
    }

    // ── Route: GET /api/workflows/:id ────────────────────────────────────────
    const matchGet = path.match(/^\/api\/workflows\/([^/]+)$/)
    if (method === 'GET' && matchGet) {
      const id  = matchGet[1]
      const row = await env.DB.prepare(
        'SELECT * FROM workflows WHERE id = ?'
      ).bind(id).first()
      if (!row) return err('워크플로우를 찾을 수 없습니다', 404)
      return json({
        ...row,
        nodes: JSON.parse(row.nodes),
        edges: JSON.parse(row.edges),
      })
    }

    // ── Route: POST /api/workflows ───────────────────────────────────────────
    if (method === 'POST' && path === '/api/workflows') {
      let body
      try { body = await request.json() } catch { return err('JSON 파싱 오류') }

      const id  = randomId()
      const now = Date.now()
      await env.DB.prepare(
        `INSERT INTO workflows (id, name, thumbnail, nodes, edges, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
        body.name      || '새 워크플로우',
        body.thumbnail || '',
        JSON.stringify(body.nodes || []),
        JSON.stringify(body.edges || []),
        now, now
      ).run()

      return json({ id, name: body.name, created_at: now, updated_at: now }, 201)
    }

    // ── Route: PUT /api/workflows/:id ────────────────────────────────────────
    const matchPut = path.match(/^\/api\/workflows\/([^/]+)$/)
    if (method === 'PUT' && matchPut) {
      const id = matchPut[1]
      let body
      try { body = await request.json() } catch { return err('JSON 파싱 오류') }

      const existing = await env.DB.prepare(
        'SELECT id FROM workflows WHERE id = ?'
      ).bind(id).first()
      if (!existing) return err('워크플로우를 찾을 수 없습니다', 404)

      const now = Date.now()
      await env.DB.prepare(
        `UPDATE workflows
         SET name = ?, thumbnail = ?, nodes = ?, edges = ?, updated_at = ?
         WHERE id = ?`
      ).bind(
        body.name      || '새 워크플로우',
        body.thumbnail || '',
        JSON.stringify(body.nodes || []),
        JSON.stringify(body.edges || []),
        now, id
      ).run()

      return json({ id, name: body.name, updated_at: now })
    }

    // ── Route: DELETE /api/workflows/:id ─────────────────────────────────────
    const matchDel = path.match(/^\/api\/workflows\/([^/]+)$/)
    if (method === 'DELETE' && matchDel) {
      const id = matchDel[1]
      await env.DB.prepare(
        'DELETE FROM workflows WHERE id = ?'
      ).bind(id).run()
      return json({ deleted: id })
    }

    // ── 404 ─────────────────────────────────────────────────────────────────
    return err('Not found', 404)
  },
}
