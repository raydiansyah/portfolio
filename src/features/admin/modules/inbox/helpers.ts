import type { Inbox } from '@/types/supabase'

export type InboxTab = 'all' | 'unread' | 'important' | 'archived'

export const TABS: { value: InboxTab; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'unread', label: 'Belum Dibaca' },
  { value: 'important', label: 'Penting' },
  { value: 'archived', label: 'Arsip' },
]

/** "Semua" deliberately hides archived mail; archive is its own tab. */
export function matchesTab(m: Inbox, tab: InboxTab) {
  switch (tab) {
    case 'all': return m.status !== 'archived'
    case 'unread': return m.status === 'unread'
    case 'important': return m.is_important && m.status !== 'archived'
    case 'archived': return m.status === 'archived'
  }
}

export function tabCounts(rows: Inbox[]): Record<InboxTab, number> {
  const c: Record<InboxTab, number> = { all: 0, unread: 0, important: 0, archived: 0 }
  for (const m of rows) for (const t of TABS) if (matchesTab(m, t.value)) c[t.value]++
  return c
}

const rtf = new Intl.RelativeTimeFormat('id', { numeric: 'auto', style: 'short' })
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 60], ['minute', 60], ['hour', 24], ['day', 7], ['week', 4.35], ['month', 12], ['year', Infinity],
]

export function relativeTime(iso: string, now = Date.now()) {
  let value = (new Date(iso).getTime() - now) / 1000
  for (const [unit, size] of STEPS) {
    if (Math.abs(value) < size) return rtf.format(Math.round(value), unit)
    value /= size
  }
  return ''
}

export const fullDate = (iso: string) =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(iso))

export const snippet = (body: string, max = 110) => {
  const flat = body.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

export function quoteReply(m: Inbox) {
  const quoted = m.body.split('\n').map((l) => `> ${l}`).join('\n')
  return `Halo ${m.sender_name.split(' ')[0]},\n\n\n\nPada ${fullDate(m.created_at)}, ${m.sender_name} <${m.sender_email}> menulis:\n${quoted}`
}
