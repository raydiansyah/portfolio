import { create } from 'zustand'
import { listInbox } from './data/repo'
import { listAccessLogs } from './data/slides'

export interface AdminNotification {
  id: string
  kind: 'inbox' | 'slide'
  title: string
  detail: string
  at: string
  href: string
}

interface AdminState {
  unreadInbox: number
  notifications: AdminNotification[]
  seenAt: string
  refresh: () => Promise<void>
  markAllSeen: () => void
}

const SEEN_KEY = 'admin:notifications-seen'

/**
 * Cross-module UI state: unread badge + notification feed.
 * SUPABASE: subscribe for live updates instead of polling, e.g.
 *   sb.channel('admin').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inboxes' }, refresh).subscribe()
 */
export const useAdminStore = create<AdminState>((set) => ({
  unreadInbox: 0,
  notifications: [],
  seenAt: localStorage.getItem(SEEN_KEY) ?? '1970-01-01T00:00:00.000Z',
  async refresh() {
    const [inbox, logs] = await Promise.all([listInbox(), listAccessLogs(5)])
    const unread = inbox.filter((m) => m.status === 'unread')
    const notifications: AdminNotification[] = [
      ...unread.map((m) => ({ id: m.id, kind: 'inbox' as const, title: m.subject, detail: m.sender_name, at: m.created_at, href: `/inbox?id=${m.id}` })),
      ...logs.map((l) => ({ id: l.id, kind: 'slide' as const, title: 'Slide opened', detail: l.user_agent ?? 'Unknown device', at: l.accessed_at, href: '/slides' })),
    ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8)
    set({ unreadInbox: unread.length, notifications })
  },
  markAllSeen() {
    const at = new Date().toISOString()
    localStorage.setItem(SEEN_KEY, at)
    set({ seenAt: at })
  },
}))
