import type { Session } from '@supabase/supabase-js'
import { Bell, ExternalLink, Inbox, LogOut, Moon, Presentation, Sun, UserRound } from 'lucide-react'
import { Fragment } from 'react'
import { Link, useLocation } from 'wouter'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useTheme } from '@/lib/theme'
import { signOut } from '@/features/secure/auth'
import { NAV } from '../nav'
import { useAdminStore } from '../store'

const relative = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (m < 60) return `${Math.max(1, m)}m ago`
  const h = Math.round(m / 60)
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`
}

export function AdminHeader({ session }: { session: Session }) {
  const [location, navigate] = useLocation()
  const { theme, toggle } = useTheme()
  const { notifications, seenAt, markAllSeen } = useAdminStore()
  const fresh = notifications.filter((n) => n.at > seenAt).length
  const current = NAV.find((n) => location === n.path || location.startsWith(`${n.path}/`))
  const email = session.user.email ?? 'admin'
  const initials = email.slice(0, 2).toUpperCase()

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur md:px-5">
      <SidebarTrigger className="size-10" aria-label="Toggle sidebar" />
      <Separator orientation="vertical" className="mx-1 h-5" />

      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList>
          <BreadcrumbItem className="hidden sm:inline-flex">
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Admin</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {current && current.path !== '/dashboard' && (
            <Fragment>
              <BreadcrumbSeparator className="hidden sm:inline-flex" />
              <BreadcrumbItem className="hidden sm:inline-flex">
                <span className="text-muted-foreground">{current.group}</span>
              </BreadcrumbItem>
            </Fragment>
          )}
          <BreadcrumbSeparator className="hidden sm:inline-flex" />
          <BreadcrumbItem>
            <BreadcrumbPage className="truncate">{current?.label ?? 'Dashboard'}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Button variant="ghost" size="icon" className="size-10" onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
        {theme === 'dark' ? <Sun aria-hidden /> : <Moon aria-hidden />}
      </Button>

      <DropdownMenu onOpenChange={(open) => open && markAllSeen()}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative size-10" aria-label={fresh ? `Notifications, ${fresh} new` : 'Notifications'}>
            <Bell aria-hidden />
            {fresh > 0 && <span className="absolute top-2 right-2 size-2 rounded-full bg-lantern" aria-hidden />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notifications.length === 0 && <p className="px-2 py-6 text-center text-sm text-muted-foreground">You're all caught up.</p>}
          {notifications.map((n) => (
            <DropdownMenuItem key={n.id} onSelect={() => navigate(n.href)} className="items-start gap-3 py-2">
              {n.kind === 'inbox' ? <Inbox className="mt-0.5" aria-hidden /> : <Presentation className="mt-0.5" aria-hidden />}
              <span className="grid min-w-0 flex-1">
                <span className="truncate text-sm">{n.title}</span>
                <span className="truncate text-xs text-muted-foreground">{n.detail} · {relative(n.at)}</span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-10 rounded-full" aria-label="Account menu">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="grid">
            <span className="truncate">{email}</span>
            <span className="hud-label text-[10px] text-muted-foreground">{String(session.user.app_metadata?.role ?? 'admin')}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate('/profile')}>
            <UserRound aria-hidden /> Profile
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href="/" target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden /> Open public site
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void signOut()} variant="destructive">
            <LogOut aria-hidden /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
