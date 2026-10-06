import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Admin area and slide portal are separate chunks; the harbor never loads them.
const SecureApp = lazy(() => import('./features/secure/SecureApp'))
const SlidesPortal = lazy(() => import('./features/slides-portal/SlidesPortal'))
const path = location.pathname
const isSecure = /^\/secure(\/|$)/.test(path)
const isSlides = /^\/slides(\/|$)/.test(path)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isSecure || isSlides ? (
      <Suspense fallback={null}>{isSecure ? <SecureApp /> : <SlidesPortal />}</Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
