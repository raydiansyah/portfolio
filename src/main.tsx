import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// The admin area is a separate chunk; public visitors never load it.
const SecureApp = lazy(() => import('./features/secure/SecureApp'))
const isSecure = /^\/secure(\/|$)/.test(location.pathname)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isSecure ? (
      <Suspense fallback={null}>
        <SecureApp />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
