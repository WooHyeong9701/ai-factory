// ── Workflow API client ───────────────────────────────────────────────────────
// Talks to the Cloudflare Worker (ai-factory-api)

const BASE = (import.meta.env.VITE_CF_WORKER_URL || '').replace(/\/$/, '')

function apiUrl(path) {
  return `${BASE}${path}`
}

export async function listWorkflows() {
  const r = await fetch(apiUrl('/api/workflows'))
  if (!r.ok) throw new Error('목록을 불러오지 못했습니다')
  return (await r.json()).workflows || []
}

export async function getWorkflow(id) {
  const r = await fetch(apiUrl(`/api/workflows/${id}`))
  if (!r.ok) throw new Error('워크플로우를 불러오지 못했습니다')
  return r.json()
}

export async function saveWorkflow({ id, name, nodes, edges }) {
  if (id) {
    // update
    const r = await fetch(apiUrl(`/api/workflows/${id}`), {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, nodes, edges }),
    })
    if (!r.ok) throw new Error('저장 실패')
    return r.json()
  } else {
    // create
    const r = await fetch(apiUrl('/api/workflows'), {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, nodes, edges }),
    })
    if (!r.ok) throw new Error('저장 실패')
    return r.json()
  }
}

export async function deleteWorkflow(id) {
  const r = await fetch(apiUrl(`/api/workflows/${id}`), { method: 'DELETE' })
  if (!r.ok) throw new Error('삭제 실패')
  return r.json()
}

export function isConfigured() {
  return !!import.meta.env.VITE_CF_WORKER_URL
}
