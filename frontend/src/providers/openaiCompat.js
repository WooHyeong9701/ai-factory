// OpenAI Chat Completions API (works for OpenAI, Groq, DeepSeek, xAI, Mistral,
// Perplexity, Together, Fireworks, OpenRouter, and any compatible endpoint).

import { getApiKey, getBaseUrl } from './keyStore'
import { getProvider } from './registry'

function mapOptions(opts) {
  if (!opts) return {}
  const out = {}
  if (opts.temperature != null)    out.temperature = opts.temperature
  if (opts.top_p != null)          out.top_p = opts.top_p
  if (opts.num_predict != null)    out.max_tokens = opts.num_predict
  if (opts.seed != null)           out.seed = opts.seed
  // top_k and repeat_penalty are not OpenAI-standard — silently ignored.
  return out
}

export async function* streamChatOpenAI(providerId, model, messages, signal, options) {
  const provider = getProvider(providerId)
  const baseUrl = (getBaseUrl(providerId) || provider.defaultBaseUrl).replace(/\/$/, '')
  const apiKey = getApiKey(providerId)

  const headers = { 'Content-Type': 'application/json' }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
  // OpenRouter optional attribution headers
  if (providerId === 'openrouter') {
    headers['HTTP-Referer'] = (typeof window !== 'undefined' && window.location?.origin) || ''
    headers['X-Title'] = 'AI Factory'
  }

  const body = {
    model,
    messages,
    stream: true,
    ...mapOptions(options),
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
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

    // SSE: lines starting with "data: "
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const raw of lines) {
      const line = raw.trim()
      if (!line || !line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') return
      try {
        const msg = JSON.parse(payload)
        const delta = msg.choices?.[0]?.delta?.content
        if (delta) yield delta
      } catch { /* skip malformed */ }
    }
  }
}
