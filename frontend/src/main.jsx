import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ReactFlowProvider } from '@xyflow/react'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App.jsx'

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

function Root() {
  const inner = (
    <ReactFlowProvider>
      <App />
    </ReactFlowProvider>
  )

  // Clerk key가 없으면 Provider 없이 렌더링 (로그인 기능만 비활성화)
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
