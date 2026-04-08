// ── Workflow API client ───────────────────────────────────────────────────────
// Talks to the Cloudflare Worker (ai-factory-api) with Clerk JWT auth

const BASE = (import.meta.env.VITE_CF_WORKER_URL || '').replace(/\/$/, '')

function apiUrl(path) {
  return `${BASE}${path}`
}

function authHeaders(token) {
  const h = { 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

export async function listWorkflows(token) {
  const r = await fetch(apiUrl('/api/workflows'), { headers: authHeaders(token) })
  if (!r.ok) throw new Error('목록을 불러오지 못했습니다')
  return (await r.json()).workflows || []
}

export async function getWorkflow(id, token) {
  const r = await fetch(apiUrl(`/api/workflows/${id}`), { headers: authHeaders(token) })
  if (!r.ok) throw new Error('워크플로우를 불러오지 못했습니다')
  return r.json()
}

export async function saveWorkflow({ id, name, nodes, edges }, token) {
  if (id) {
    const r = await fetch(apiUrl(`/api/workflows/${id}`), {
      method:  'PUT',
      headers: authHeaders(token),
      body:    JSON.stringify({ name, nodes, edges }),
    })
    if (!r.ok) throw new Error('저장 실패')
    return r.json()
  } else {
    const r = await fetch(apiUrl('/api/workflows'), {
      method:  'POST',
      headers: authHeaders(token),
      body:    JSON.stringify({ name, nodes, edges }),
    })
    if (!r.ok) throw new Error('저장 실패')
    return r.json()
  }
}

export async function deleteWorkflow(id, token) {
  const r = await fetch(apiUrl(`/api/workflows/${id}`), {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  if (!r.ok) throw new Error('삭제 실패')
  return r.json()
}

export function isConfigured() {
  return !!import.meta.env.VITE_CF_WORKER_URL
}
