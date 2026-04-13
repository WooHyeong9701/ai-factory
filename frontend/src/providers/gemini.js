// Google Gemini streamGenerateContent API (SSE).

import { getApiKey, getBaseUrl } from './keyStore'
import { getProvider } from './registry'

function toGeminiContents(messages) {
  const systemParts = []
  const contents = []
  for (const m of messages) {
    if (m.role === 'system') {
      systemParts.push(m.content)
      continue
    }
    contents.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })
  }
  return { systemInstruction: systemParts.length ? { parts: [{ text: systemParts.join('\n\n') }] } : undefined, contents }
}

function mapOptions(opts) {
  if (!opts) return {}
  const out = {}
  if (opts.temperature != null)   out.temperature = opts.temperature
  if (opts.top_p != null)         out.topP = opts.top_p
  if (opts.top_k != null)         out.topK = opts.top_k
  if (opts.num_predict != null)   out.maxOutputTokens = opts.num_predict
  if (opts.seed != null)          out.seed = opts.seed
  return out
}

export async function* streamChatGemini(model, messages, signal, options) {
  const provider = getProvider('gemini')
  const baseUrl = (getBaseUrl('gemini') || provider.defaultBaseUrl).replace(/\/$/, '')
  const apiKey = getApiKey('gemini')
  if (!apiKey) throw new Error('Gemini API key is not set')

  const { systemInstruction, contents } = toGeminiContents(messages)
  const generationConfig = mapOptions(options)

  const body = {
    contents,
    ...(systemInstruction ? { systemInstruction } : {}),
    ...(Object.keys(generationConfig).length ? { generationConfig } : {}),
  }

  // SSE streaming: ?alt=sse
  const url = `${baseUrl}/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}${text ? ': ' + text.slice(0, 300) : ''}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const raw of lines) {
      const line = raw.trim()
      if (!line || !line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload) continue
      try {
        const evt = JSON.parse(payload)
        const parts = evt.candidates?.[0]?.content?.parts
        if (parts) {
          for (const p of parts) {
            if (p.text) yield p.text
          }
        }
      } catch { /* skip */ }
    }
  }
}
