// Direct Ollama REST API client — no backend required.
// Users must run Ollama with: OLLAMA_ORIGINS="*" ollama serve

// ── RAM estimation from model name ────────────────────────────────────────────
const RAM_HEURISTICS = [
  [/0\.5b/i, 0.7],
  [/1\.1b/i, 0.8],
  [/1\.5b/i, 1.2],
  [/:1b\b/i, 1.3],
  [/:3b\b/i, 2.0],
  [/:4b\b/i, 2.5],
  [/phi3:mini/i, 2.3],
  [/:7b\b/i, 4.1],
  [/:8b\b/i, 4.7],
  [/:9b\b/i, 5.5],
  [/:12b\b/i, 7.5],
  [/:13b\b/i, 8.0],
  [/nomic-embed/i, 0.3],
]

export function estimateRamGb(modelName) {
  for (const [pattern, ram] of RAM_HEURISTICS) {
    if (pattern.test(modelName)) return ram
  }
  return null
}

// ── Connection test ────────────────────────────────────────────────────────────
export async function testConnection(ollamaUrl) {
  const res = await fetch(`${ollamaUrl}/api/tags`, {
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return true
}

// ── Fetch model list with RAM estimates ───────────────────────────────────────
export async function fetchModels(ollamaUrl) {
  const res = await fetch(`${ollamaUrl}/api/tags`, {
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const models = (data.models || []).map((m) => m.name)
  const ramEstimates = {}
  for (const m of models) {
    const est = estimateRamGb(m)
    if (est != null) ramEstimates[m] = est
  }
  return { models, ramEstimates }
}

// ── Fetch model details (size, RAM) for ModelManager ─────────────────────────
export async function fetchModelDetails(ollamaUrl) {
  const res = await fetch(`${ollamaUrl}/api/tags`, {
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return (data.models || []).map((m) => {
    const size_gb = (m.size || 0) / 1e9
    return {
      name: m.name,
      size_gb,
      estimated_ram_gb: estimateRamGb(m.name) ?? size_gb * 1.1,
    }
  })
}

// ── System stats (RAM / CPU / Swap) via Ollama ps + browser APIs ─────────────
export async function fetchSystemStats(ollamaUrl) {
  // Total RAM: use navigator.deviceMemory (Chrome) or fallback
  const totalRam = navigator.deviceMemory || 8 // GB (approximate)

  // Running models memory from Ollama /api/ps
  let modelMemory = 0
  try {
    const res = await fetch(`${ollamaUrl}/api/ps`, { signal: AbortSignal.timeout(3000) })
    if (res.ok) {
      const data = await res.json()
      for (const m of data.models || []) {
        modelMemory += (m.size_vram || m.size || 0) / 1e9
      }
    }
  } catch { /* ignore */ }

  // Estimate usage: base OS ~2-3GB + loaded models
  const baseUsage = 2.5
  const usedEstimate = Math.min(baseUsage + modelMemory, totalRam * 0.95)
  const available = Math.max(totalRam - usedEstimate, 0.2)
  const ramPercent = (usedEstimate / totalRam) * 100

  return {
    ram_total_gb: totalRam,
    ram_available_gb: available,
    ram_percent: ramPercent,
    cpu_percent: 0, // not available from browser
    swap_used_gb: 0,
    swap_total_gb: 0,
    swap_percent: 0,
  }
}

// ── Streaming chat (NDJSON) ───────────────────────────────────────────────────
export async function* streamChat(ollamaUrl, model, messages, signal, options) {
  const body = { model, messages, stream: true }
  if (options && Object.keys(options).length > 0) {
    body.options = options
  }
  const res = await fetch(`${ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}${text ? ': ' + text : ''}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() // keep incomplete trailing line
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const msg = JSON.parse(line)
        if (msg.message?.content) yield msg.message.content
        if (msg.done) return
      } catch { /* skip malformed */ }
    }
  }
}

// ── Streaming model pull ───────────────────────────────────────────────────────
export async function* streamPull(ollamaUrl, modelName, signal) {
  const res = await fetch(`${ollamaUrl}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: modelName, stream: true }),
    signal,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const msg = JSON.parse(line)
        const percent = msg.total > 0 ? Math.round((msg.completed / msg.total) * 100) : 0
        yield { status: msg.status || '', percent }
        if (msg.status === 'success') return
      } catch { /* skip */ }
    }
  }
}

// ── Delete model ───────────────────────────────────────────────────────────────
export async function deleteModel(ollamaUrl, modelName) {
  const res = await fetch(`${ollamaUrl}/api/delete`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: modelName }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}
