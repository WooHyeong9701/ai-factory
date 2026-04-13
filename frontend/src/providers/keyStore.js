// LocalStorage-backed storage for API keys and base URLs per provider.
// Keys never leave the user's browser.

const KEYS_STORAGE = 'ai_factory_provider_keys'
const URLS_STORAGE = 'ai_factory_provider_urls'

function readJson(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return {}
    return JSON.parse(raw) || {}
  } catch {
    return {}
  }
}

function writeJson(storageKey, obj) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(obj))
  } catch { /* quota / private mode */ }
}

// ── API keys ──────────────────────────────────────────────────────────────────
export function getApiKey(providerId) {
  return readJson(KEYS_STORAGE)[providerId] || ''
}

export function setApiKey(providerId, key) {
  const m = readJson(KEYS_STORAGE)
  if (key) m[providerId] = key
  else delete m[providerId]
  writeJson(KEYS_STORAGE, m)
}

export function getAllApiKeys() {
  return readJson(KEYS_STORAGE)
}

// ── Base URLs (overrides) ─────────────────────────────────────────────────────
export function getBaseUrl(providerId) {
  return readJson(URLS_STORAGE)[providerId] || ''
}

export function setBaseUrl(providerId, url) {
  const m = readJson(URLS_STORAGE)
  if (url) m[providerId] = url
  else delete m[providerId]
  writeJson(URLS_STORAGE, m)
}

// ── Enabled status (convenience: provider is "configured" if key present OR it doesn't require one) ──
export function isProviderConfigured(provider) {
  if (!provider) return false
  if (provider.id === 'ollama') return true
  if (!provider.requiresKey) return true
  return !!getApiKey(provider.id)
}
