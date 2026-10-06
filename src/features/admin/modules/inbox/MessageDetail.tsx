import { Archive, ArchiveRestore, ArrowLeft, CheckCheck, Mail, MailOpen, Reply, Star, Trash2 } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { Inbox } from '@/types/supabase'
import { ConfirmDelete } from '../../ui/ConfirmDelete'
import { fullDate, relativeTime } from './helpers'

interface Props {
  message: Inbox
  onBack: () => void
  onToggleRead: (m: Inbox) => void
  onToggleImportant: (m: Inbox) => void
  onToggleArchive: (m: Inbox) => void
  onDelete: (m: Inbox) => void
  onReply: (m: Inbox) => void
}

function Action({ label, onClick, children, className, pressed }: { label: string; onClick?: () => void; children: ReactNode; className?: string; pressed?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} aria-pressed={pressed} onClick={onClick} className={cn('text-muted-foreground', className)}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function MessageDetail({ message: m, onBack, onToggleRead, onToggleImportant, onToggleArchive, onDelete, onReply }: Props) {
  const heading = useRef<HTMLHeadingElement>(null)
  const archived = m.status === 'archived'
  const unread = m.status === 'unread'

  // Below lg the list is replaced by the detail view, so move focus to the subject. On desktop the
  // list stays visible and keeps focus (arrow-key navigation must not be interrupted).
  useEffect(() => {
    if (!window.matchMedia('(min-width: 1024px)').matches) heading.current?.focus({ preventScroll: true })
  }, [m.id])

  return (
    <article className="flex min-h-0 flex-1 flex-col" aria-labelledby={`msg-${m.id}`}>
      <div className="flex items-center gap-1 border-b px-2 py-2 sm:px-4">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Kembali ke daftar pesan" className="lg:hidden">
          <ArrowLeft />
        </Button>
        <div className="ml-auto flex items-center gap-0.5">
          <Action label={unread ? 'Tandai sudah dibaca' : 'Tandai belum dibaca'} onClick={() => onToggleRead(m)}>
            {unread ? <MailOpen /> : <Mail />}
          </Action>
          <Action label={m.is_important ? 'Hapus tanda penting' : 'Tandai penting'} pressed={m.is_important} onClick={() => onToggleImportant(m)}>
            <Star className={cn(m.is_important && 'fill-amber-400 text-amber-500')} />
          </Action>
          <Action label={archived ? 'Kembalikan dari arsip' : 'Arsipkan'} onClick={() => onToggleArchive(m)}>
            {archived ? <ArchiveRestore /> : <Archive />}
          </Action>
          <ConfirmDelete title="Hapus pesan ini?" description={`Pesan dari ${m.sender_name} akan dihapus permanen.`} onConfirm={() => onDelete(m)}>
            <Button variant="ghost" size="icon" aria-label="Hapus pesan" className="text-muted-foreground hover:text-destructive">
              <Trash2 />
            </Button>
          </ConfirmDelete>
          <Button className="ml-2" onClick={() => onReply(m)}><Reply /> Balas</Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <header className="flex flex-col gap-3">
            <h2 id={`msg-${m.id}`} ref={heading} tabIndex={-1} className="text-xl font-semibold tracking-tight text-balance outline-none md:text-2xl">
              {m.subject}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-medium">{m.sender_name}</span>
              <a href={`mailto:${m.sender_email}`} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                {m.sender_email}
              </a>
              {m.phone && (
                <a href={`tel:${m.phone}`} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                  {m.phone}
                </a>
              )}
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Layanan</dt>
              <dd>{m.service ?? '—'}</dd>
              <dt className="text-muted-foreground">Anggaran</dt>
              <dd>{m.budget}</dd>
            </dl>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <time dateTime={m.created_at} title={relativeTime(m.created_at)}>{fullDate(m.created_at)}</time>
              {archived && <Badge variant="outline">Arsip</Badge>}
              {m.replied_at && (
                <Badge variant="secondary"><CheckCheck aria-hidden /> Dibalas {relativeTime(m.replied_at)}</Badge>
              )}
            </div>
          </header>
          <div className="border-t pt-6 text-[15px] leading-relaxed whitespace-pre-wrap break-words">{m.body}</div>
        </div>
      </div>
    </article>
  )
}
