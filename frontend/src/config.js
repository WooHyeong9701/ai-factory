// ── Backend API URL ───────────────────────────────────────────────────────────
// In development: http://localhost:8000  (set in .env)
// In production:  set VITE_API_BASE_URL in Cloudflare Pages environment variables
//
// Example for Cloudflare Pages:
//   VITE_API_BASE_URL = http://localhost:8000   (each user runs the backend locally)
//
// Note: the backend must be running locally on the user's machine.
// Ollama also runs locally and is configured via the onboarding wizard.

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')
export const WS_BASE  = API_BASE.replace(/^https?/, (p) => (p === 'https' ? 'wss' : 'ws'))
