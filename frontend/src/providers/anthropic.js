// Anthropic Messages API with SSE streaming.
// Requires anthropic-dangerous-direct-browser-access header for direct browser use.

import { getApiKey, getBaseUrl } from './keyStore'
import { getProvider } from './registry'

function splitSystem(messages) {
  // Anthropic expects system as a top-level field, not a message role.
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n')
  const rest = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
  return { system, messages: rest }
}

function mapOptions(opts) {
  if (!opts) return {}
  const out = {}
  if (opts.temperature != null)  out.temperature = opts.temperature
  if (opts.top_p != null)        out.top_p = opts.top_p
  if (opts.top_k != null)        out.top_k = opts.top_k
  // Anthropic requires max_tokens. Default to 4096 if not provided.
  out.max_tokens = opts.num_predict != null ? opts.num_predict : 4096
  return out
}

export async function* streamChatAnthropic(model, messages, signal, options) {
  const provider = getProvider('anthropic')
  const baseUrl = (getBaseUrl('anthropic') || provider.defaultBaseUrl).replace(/\/$/, '')
  const apiKey = getApiKey('anthropic')
  if (!apiKey) throw new Error('Anthropic API key is not set')

  const { system, messages: msgs } = splitSystem(messages)
  const mapped = mapOptions(options)

  const body = {
    model,
    messages: msgs,
    stream: true,
    ...mapped,
  }
  if (system) body.system = system
  if (body.max_tokens == null) body.max_tokens = 4096

  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
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
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
          if (evt.delta.text) yield evt.delta.text
        } else if (evt.type === 'message_stop') {
          return
        }
      } catch { /* skip */ }
    }
  }
}
