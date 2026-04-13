// Unified dispatcher: routes streamChat calls to the correct provider adapter.
import { streamChat as streamChatOllama } from '../ollamaClient'
import { streamChatOpenAI } from './openaiCompat'
import { streamChatAnthropic } from './anthropic'
import { streamChatGemini } from './gemini'
import { getProvider } from './registry'

export { PROVIDERS, getProvider } from './registry'
export {
  getApiKey, setApiKey, getAllApiKeys,
  getBaseUrl, setBaseUrl, isProviderConfigured,
} from './keyStore'

/**
 * Unified streaming chat.
 * @param {Object} p
 * @param {string} p.providerId  — provider id from registry ('ollama', 'openai', ...)
 * @param {string} p.model       — model name
 * @param {Array}  p.messages    — [{role, content}]
 * @param {AbortSignal} p.signal
 * @param {Object} p.options     — generic option shape (temperature, top_p, top_k, num_predict, seed, repeat_penalty)
 * @param {string} p.ollamaUrl   — required when providerId === 'ollama'
 */
export async function* streamChat({ providerId, model, messages, signal, options, ollamaUrl }) {
  const provider = getProvider(providerId || 'ollama')
  switch (provider.kind) {
    case 'ollama':
      yield* streamChatOllama(ollamaUrl, model, messages, signal, options)
      return
    case 'anthropic':
      yield* streamChatAnthropic(model, messages, signal, options)
      return
    case 'gemini':
      yield* streamChatGemini(model, messages, signal, options)
      return
    case 'openai-compat':
      yield* streamChatOpenAI(provider.id, model, messages, signal, options)
      return
    default:
      throw new Error(`Unknown provider kind: ${provider.kind}`)
  }
}
