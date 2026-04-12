// ── Marketplace API client ────────────────────────────────────────────────────

const BASE = (import.meta.env.VITE_CF_WORKER_URL || '').replace(/\/$/, '')

function apiUrl(path) { return `${BASE}${path}` }

function headers(token) {
  const h = { 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

/** Browse marketplace — public, no auth needed */
export async function browseMarketplace({ sort, category, q, page } = {}, token) {
  const params = new URLSearchParams()
  if (sort) params.set('sort', sort)
  if (category && category !== 'all') params.set('category', category)
  if (q) params.set('q', q)
  if (page) params.set('page', String(page))
  const qs = params.toString()
  const r = await fetch(apiUrl(`/api/marketplace${qs ? '?' + qs : ''}`), { headers: headers(token) })
  if (!r.ok) throw new Error('마켓 로딩 실패')
  return r.json()
}

/** Get single shared workflow detail */
export async function getSharedWorkflow(id, token) {
  const r = await fetch(apiUrl(`/api/marketplace/${id}`), { headers: headers(token) })
  if (!r.ok) throw new Error('워크플로우를 불러오지 못했습니다')
  return r.json()
}

/** Publish workflow to marketplace */
export async function publishWorkflow(data, token) {
  const r = await fetch(apiUrl('/api/marketplace'), {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(data),
  })
  if (!r.ok) throw new Error('공유 실패')
  return r.json()
}

/** Update shared workflow */
export async function updateSharedWorkflow(id, data, token) {
  const r = await fetch(apiUrl(`/api/marketplace/${id}`), {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(data),
  })
  if (!r.ok) throw new Error('업데이트 실패')
  return r.json()
}

/** Delete shared workflow */
export async function deleteSharedWorkflow(id, token) {
  const r = await fetch(apiUrl(`/api/marketplace/${id}`), {
    method: 'DELETE',
    headers: headers(token),
  })
  if (!r.ok) throw new Error('삭제 실패')
  return r.json()
}

/** Toggle like */
export async function toggleLike(workflowId, token) {
  const r = await fetch(apiUrl('/api/marketplace/like'), {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ workflow_id: workflowId }),
  })
  if (!r.ok) throw new Error('좋아요 실패')
  return r.json()
}

/** Fork (import) — increment fork count */
export async function forkWorkflow(workflowId, token) {
  const r = await fetch(apiUrl('/api/marketplace/fork'), {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ workflow_id: workflowId }),
  })
  if (!r.ok) throw new Error('가져오기 실패')
  return r.json()
}

/** Get my shared workflows */
export async function getMyShared(token) {
  const r = await fetch(apiUrl('/api/marketplace/mine'), { headers: headers(token) })
  if (!r.ok) throw new Error('내 공유 목록 실패')
  return r.json()
}
