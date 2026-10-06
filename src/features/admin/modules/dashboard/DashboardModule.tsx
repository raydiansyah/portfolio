import {
  ArrowUpRight, Briefcase, ExternalLink, Eye, Inbox, LayoutTemplate, Mail, Plus, Presentation, Sparkles, Upload,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'wouter'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getStats, listInbox, type DashboardStats } from '../../data/repo'
import { countAccessLogs, listAccessLogs, listSlides } from '../../data/slides'
import { PageHeader } from '../../ui/PageHeader'
import { useResource } from '../../ui/useResource'

interface ActivityEvent {
  id: string
  kind: 'inbox' | 'slide'
  title: string
  detail: string
  at: string
  href: string
}

async function loadDashboard() {
  const [slides, logCount, logs, inbox] = await Promise.all([listSlides(), countAccessLogs(), listAccessLogs(6), listInbox()])
  const stats = await getStats(slides.filter((s) => s.is_active).length, logCount)
  const titles = new Map(slides.map((s) => [s.id, s.title]))
  const events: ActivityEvent[] = [
    ...inbox.slice(0, 6).map((m) => ({
      id: m.id, kind: 'inbox' as const, title: m.subject, detail: `From ${m.sender_name}`, at: m.created_at, href: `/inbox?id=${m.id}`,
    })),
    ...logs.map((l) => ({
      id: l.id, kind: 'slide' as const, title: `Opened “${titles.get(l.slide_id) ?? 'Deleted slide'}”`,
      detail: l.user_agent ?? 'Unknown device', at: l.accessed_at, href: '/slides',
    })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6)
  return { stats, events }
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000], ['month', 2_592_000], ['week', 604_800], ['day', 86_400], ['hour', 3_600], ['minute', 60],
]

function relativeTime(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000
  for (const [unit, secs] of UNITS) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit)
  }
  return 'just now'
}

interface Metric {
  label: string
  icon: LucideIcon
  href: string
  value: (s: DashboardStats) => string
  sub?: (s: DashboardStats) => string
}

const METRICS: Metric[] = [
  { label: 'Total Portofolio', icon: Briefcase, href: '/portfolio', value: (s) => String(s.portfolios) },
  { label: 'Total Layanan', icon: LayoutTemplate, href: '/services', value: (s) => String(s.services) },
  { label: 'Inbox', icon: Inbox, href: '/inbox', value: (s) => String(s.inboxUnread), sub: (s) => `unread of ${s.inboxTotal}` },
  { label: 'Total Skills', icon: Sparkles, href: '/skills', value: (s) => String(s.skills) },
  { label: 'Slides Active', icon: Presentation, href: '/slides', value: (s) => String(s.slidesActive) },
  { label: 'Access Logs', icon: Eye, href: '/slides', value: (s) => String(s.accessLogs), sub: () => 'slide opens' },
]

const CARD = 'flex h-32 flex-col justify-between rounded-xl border bg-card p-4'

function MetricCard({ metric, stats }: { metric: Metric; stats: DashboardStats }) {
  const Icon = metric.icon
  return (
    <Link
      href={metric.href}
      className={`${CARD} group outline-none transition-colors hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-ring`}
    >
      <div className="flex items-center justify-between">
        <span className="hud-label text-muted-foreground">{metric.label}</span>
        <Icon className="size-4 text-muted-foreground group-hover:text-lantern" aria-hidden />
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="text-3xl font-semibold tracking-tight tabular-nums">
          {metric.value(stats)}
          {metric.sub && <span className="ml-2 text-sm font-normal text-muted-foreground">{metric.sub(stats)}</span>}
        </p>
        <ArrowUpRight className="size-4 text-muted-foreground opacity-0 motion-safe:transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
      </div>
    </Link>
  )
}

export default function DashboardModule() {
  const { data, error, reload } = useResource(loadDashboard)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Overview" title="Dashboard" description="A snapshot of content, messages and slide traffic." />

      {error && (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-destructive/40 p-4 text-sm">
          <span>Could not load the dashboard: {error.message}</span>
          <Button variant="outline" size="sm" onClick={reload}>Retry</Button>
        </div>
      )}

      <section aria-labelledby="metrics-h" aria-busy={!data}>
        <h2 id="metrics-h" className="sr-only">Metrics</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data
            ? METRICS.map((m) => <MetricCard key={m.label} metric={m} stats={data.stats} />)
            : METRICS.map((m) => (
                <div key={m.label} className={CARD}>
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-9 w-20" />
                </div>
              ))}
        </div>
      </section>

      <section aria-labelledby="quick-h" className="flex flex-col gap-3">
        <h2 id="quick-h" className="hud-label text-muted-foreground">Quick actions</h2>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/portfolio?new=1"><Plus aria-hidden />New portfolio</Link></Button>
          <Button asChild variant="outline"><Link href="/slides?new=1"><Upload aria-hidden />Upload slide</Link></Button>
          <Button asChild variant="outline"><Link href="/inbox"><Mail aria-hidden />Open inbox</Link></Button>
          <Button asChild variant="outline">
            <a href="/" target="_blank" rel="noreferrer"><ExternalLink aria-hidden />View site</a>
          </Button>
        </div>
      </section>

      <section aria-labelledby="activity-h" className="flex flex-col gap-3">
        <h2 id="activity-h" className="hud-label text-muted-foreground">Recent activity</h2>
        <ol className="divide-y rounded-xl border bg-card">
          {data
            ? data.events.length === 0
              ? <li className="p-4 text-sm text-muted-foreground">No activity yet.</li>
              : data.events.map((e) => {
                  const Icon = e.kind === 'inbox' ? Mail : Presentation
                  return (
                    <li key={`${e.kind}-${e.id}`}>
                      <Link href={e.href} className="flex h-16 items-center gap-3 px-4 outline-none hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                        <span className="grid size-8 shrink-0 place-items-center rounded-md border bg-background">
                          <Icon className="size-4 text-muted-foreground" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{e.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">{e.detail}</span>
                        </span>
                        <time dateTime={e.at} className="shrink-0 text-xs text-muted-foreground tabular-nums">{relativeTime(e.at)}</time>
                      </Link>
                    </li>
                  )
                })
            : Array.from({ length: 6 }, (_, i) => (
                <li key={i} className="flex h-16 items-center gap-3 px-4">
                  <Skeleton className="size-8" />
                  <span className="flex flex-1 flex-col gap-1.5"><Skeleton className="h-3.5 w-1/2" /><Skeleton className="h-3 w-1/3" /></span>
                  <Skeleton className="h-3 w-14" />
                </li>
              ))}
        </ol>
      </section>
    </div>
  )
}
