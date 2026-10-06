import { Loader2 } from 'lucide-react'
import { Suspense, lazy, useEffect } from 'react'
import { PageSkeleton } from '@/features/admin/ui/PageSkeleton'
import { useAdminSession } from './auth'
import { LoginPage } from './LoginPage'

// The admin shell only downloads after a successful admin sign-in.
const AdminApp = lazy(() => import('@/features/admin/AdminApp'))

/**
 * Admin area mounted for /secure/*. Not linked from the public harbor and
 * loaded as a separate chunk, so visitors never download it.
 *   /secure      -> login (redirects to /secure/dashboard when already signed in)
 *   /secure/*    -> admin modules (guarded; signed-out visitors go back to /secure)
 */

const LOGIN = '/secure'
const DASHBOARD = '/secure/dashboard'

function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    document.title = 'Admin — Ray Diansyah'
    return () => meta.remove()
  }, [])
}

export default function SecureApp() {
  useNoIndex()
  const auth = useAdminSession()

  // The session decides the screen; the URL just mirrors it
  // (signed-in admins -> /secure/dashboard, everyone else -> /secure).
  useEffect(() => {
    if (auth.status === 'loading') return
    const path = location.pathname.replace(/\/+$/, '')
    if (auth.status === 'signed-out' && path !== LOGIN) history.replaceState(null, '', LOGIN)
    if (auth.status === 'admin' && path === LOGIN) history.replaceState(null, '', DASHBOARD)
  }, [auth.status])

  if (auth.status === 'loading') {
    return (
      <main className="grid min-h-dvh place-items-center" aria-busy="true">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Checking session" />
      </main>
    )
  }

  if (auth.status === 'admin') {
    return (
      <Suspense fallback={<div className="p-8"><PageSkeleton /></div>}>
        <AdminApp session={auth.session} />
      </Suspense>
    )
  }
  return <LoginPage />
}
