import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useAdminSession } from './auth'
import { DashboardPage } from './DashboardPage'
import { LoginPage } from './LoginPage'

/**
 * Admin area mounted for /secure/*. Not linked from the public harbor and
 * loaded as a separate chunk, so visitors never download it.
 *   /secure            -> login (or dashboard when already signed in)
 *   /secure/dashboard  -> dashboard (guarded)
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
    const to = auth.status === 'admin' ? DASHBOARD : LOGIN
    if (location.pathname !== to) history.replaceState(null, '', to)
  }, [auth.status])

  if (auth.status === 'loading') {
    return (
      <main className="grid min-h-dvh place-items-center" aria-busy="true">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Checking session" />
      </main>
    )
  }

  if (auth.status === 'admin') return <DashboardPage session={auth.session} />
  return <LoginPage />
}
