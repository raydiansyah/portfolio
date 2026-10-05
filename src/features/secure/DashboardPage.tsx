import type { Session } from '@supabase/supabase-js'
import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { signOut } from './auth'

/** Content areas the dashboard will manage once the portfolio data moves to Supabase. */
const SECTIONS = [
  { code: '01', title: 'Projects', note: 'Featured buoys and the full archive' },
  { code: '02', title: 'About', note: 'Profile, facts and stack' },
  { code: '03', title: 'Experience', note: 'Roles and teaching history' },
  { code: '04', title: 'Services', note: 'Offers and deliverables' },
  { code: '05', title: 'Contact', note: 'Inbox and availability' },
  { code: '06', title: 'Settings', note: 'Site and account' },
]

export function DashboardPage({ session }: { session: Session }) {
  const [leaving, setLeaving] = useState(false)
  const user = session.user
  const name = (user.user_metadata?.name as string | undefined) ?? user.email ?? 'Admin'

  const logout = async () => {
    setLeaving(true)
    await signOut()
  }

  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between gap-4 border-b px-5 py-4 md:px-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-tight">Ray Diansyah</p>
          <p className="hud-label text-muted-foreground">Admin dashboard</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden font-mono text-xs text-muted-foreground sm:inline">{user.email}</span>
          <Button variant="outline" size="sm" onClick={logout} disabled={leaving} className="h-10">
            <LogOut className="size-4" aria-hidden />
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-12 md:px-10 md:py-16">
        <p className="hud-label text-muted-foreground">Signed in as {String(user.app_metadata?.role ?? '')}</p>
        <h1 className="mt-3 text-4xl font-semibold uppercase tracking-tight md:text-6xl">Welcome, {name.split(' ')[0]}</h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Content management arrives with the Supabase migration. Each area below will edit what visitors find at its harbor.
        </p>

        <Separator className="my-10" />

        <ul className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => (
            <li key={s.code} className="flex flex-col gap-2 bg-background p-6">
              <span className="font-mono text-xs text-muted-foreground">{s.code}</span>
              <span className="text-lg font-semibold uppercase tracking-tight">{s.title}</span>
              <span className="text-sm text-muted-foreground">{s.note}</span>
              <span className="hud-label mt-4 text-muted-foreground/70">Coming soon</span>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
