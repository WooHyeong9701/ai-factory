import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ReactFlowProvider } from '@xyflow/react'
import { ClerkProvider } from '@clerk/clerk-react'
import { I18nProvider } from './i18n/index'
import './index.css'
import App from './App.jsx'

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

function Root() {
  const inner = (
    <I18nProvider>
      <ReactFlowProvider>
        <App />
      </ReactFlowProvider>
    </I18nProvider>
  )

  if (!CLERK_KEY) return inner

  return (
    <ClerkProvider publishableKey={CLERK_KEY}>
      {inner}
    </ClerkProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>
)
