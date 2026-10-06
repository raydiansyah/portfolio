import { Star } from 'lucide-react'
import { useRef, type KeyboardEvent } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { Inbox } from '@/types/supabase'
import { relativeTime, snippet } from './helpers'

interface Props {
  items: Inbox[]
  selectedId: string | null
  /** `viaKeyboard` lets the caller replace (not push) history while arrowing through the list. */
  onSelect: (id: string, viaKeyboard?: boolean) => void
  onToggleImportant: (m: Inbox) => void
  label: string
}

/**
 * Roving-tabindex list: one Tab stop, ArrowUp/Down/Home/End move the selection.
 * Star buttons sit beside (not inside) the row button to avoid nested interactive content.
 */
export function MessageList({ items, selectedId, onSelect, onToggleImportant, label }: Props) {
  const refs = useRef(new Map<string, HTMLButtonElement>())
  const activeId = items.some((m) => m.id === selectedId) ? selectedId : items[0]?.id

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const i = items.findIndex((m) => m.id === activeId)
    const target =
      e.key === 'ArrowDown' ? Math.min(i + 1, items.length - 1)
        : e.key === 'ArrowUp' ? Math.max(i - 1, 0)
          : e.key === 'Home' ? 0
            : e.key === 'End' ? items.length - 1
              : null
    if (target === null || !(e.target instanceof HTMLButtonElement) || !e.target.dataset.row) return
    e.preventDefault()
    const next = items[target]
    if (!next) return
    onSelect(next.id, true)
    refs.current.get(next.id)?.focus()
  }

  return (
    <ul aria-label={label} onKeyDown={onKeyDown} className="flex flex-col divide-y">
      {items.map((m) => {
        const selected = m.id === selectedId
        const unread = m.status === 'unread'
        return (
          <li key={m.id} className="relative">
            <button
              type="button"
              data-row
              ref={(el) => {
                if (el) refs.current.set(m.id, el)
                else refs.current.delete(m.id)
              }}
              tabIndex={m.id === activeId ? 0 : -1}
              aria-current={selected ? 'true' : undefined}
              onClick={() => onSelect(m.id)}
              className={cn(
                'flex w-full flex-col gap-0.5 py-3 pr-11 pl-6 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset',
                selected ? 'bg-muted' : 'hover:bg-muted/50',
              )}
            >
              {unread && <span className="absolute top-[1.15rem] left-2.5 size-2 rounded-full bg-primary" aria-hidden />}
              <span className="flex items-baseline justify-between gap-2">
                <span className={cn('truncate text-sm', unread ? 'font-semibold' : 'font-medium text-foreground/80')}>
                  {m.sender_name}
                  {unread && <span className="sr-only"> (belum dibaca)</span>}
                </span>
                <time dateTime={m.created_at} className="shrink-0 text-xs text-muted-foreground tabular-nums">{relativeTime(m.created_at)}</time>
              </span>
              <span className={cn('truncate text-sm', unread ? 'text-foreground' : 'text-foreground/80')}>{m.subject}</span>
              <span className="line-clamp-1 text-xs text-muted-foreground">{snippet(m.body)}</span>
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => onToggleImportant(m)}
              aria-label={m.is_important ? `Hapus tanda penting: ${m.subject}` : `Tandai penting: ${m.subject}`}
              aria-pressed={m.is_important}
              className="absolute top-8 right-2 grid size-8 place-items-center rounded-md text-muted-foreground outline-none hover:bg-background hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Star className={cn('size-4', m.is_important && 'fill-amber-400 text-amber-500')} aria-hidden />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** Same row height as MessageList items (≈ 74px) so loading → loaded does not shift. */
export function MessageListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="flex flex-col divide-y" aria-busy="true" aria-label="Memuat pesan">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex flex-col gap-1.5 py-3 pr-11 pl-6">
          <div className="flex justify-between gap-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-10" /></div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
        </li>
      ))}
    </ul>
  )
}
