import { Inbox as InboxIcon, MailX, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useLocation, useSearch } from 'wouter'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { Inbox } from '@/types/supabase'
import { deleteInbox, listInbox, replyInbox, updateInbox } from '../../data/repo'
import { useAdminStore } from '../../store'
import { EmptyState } from '../../ui/EmptyState'
import { PageHeader } from '../../ui/PageHeader'
import { useResource } from '../../ui/useResource'
import { TABS, matchesTab, tabCounts, type InboxTab } from './helpers'
import { MessageDetail } from './MessageDetail'
import { MessageList, MessageListSkeleton } from './MessageList'
import { ReplyDialog } from './ReplyDialog'

const EMPTY_COPY: Record<InboxTab, string> = {
  all: 'Belum ada pesan masuk.',
  unread: 'Semua pesan sudah dibaca.',
  important: 'Belum ada pesan yang ditandai penting.',
  archived: 'Arsip kosong.',
}

/** Sidebar badge + notification feed read from the store; keep them in sync after every mutation. */
const syncStore = () => void useAdminStore.getState().refresh()

export default function InboxModule() {
  const { data, error, reload, setData } = useResource(listInbox)
  const search = useSearch()
  const [, navigate] = useLocation()
  const [tab, setTab] = useState<InboxTab>('all')
  const [replyTo, setReplyTo] = useState<Inbox | null>(null)
  // Messages already auto-marked as read, so "Mark unread" on an open message sticks.
  const autoRead = useRef(new Set<string>())

  const selectedId = new URLSearchParams(search).get('id')
  const rows = useMemo(() => data ?? [], [data])
  const counts = useMemo(() => tabCounts(rows), [rows])
  const visible = useMemo(() => rows.filter((m) => matchesTab(m, tab)), [rows, tab])
  const selected = rows.find((m) => m.id === selectedId) ?? null

  const select = (id: string, viaKeyboard?: boolean) => navigate(`/inbox?id=${encodeURIComponent(id)}`, { replace: viaKeyboard })
  const back = () => navigate('/inbox')

  /** Optimistic patch with revert on failure. */
  const patch = async (m: Inbox, changes: Partial<Inbox>, success?: { message: string; undo?: Partial<Inbox> }) => {
    const prev = data
    setData((rs) => rs?.map((r) => (r.id === m.id ? { ...r, ...changes } : r)) ?? rs)
    try {
      const saved = await updateInbox(m.id, changes)
      setData((rs) => rs?.map((r) => (r.id === m.id ? saved : r)) ?? rs)
      syncStore()
      if (success) {
        const undo = success.undo
        toast.success(success.message, undo ? { action: { label: 'Urungkan', onClick: () => void patch(saved, undo) } } : undefined)
      }
    } catch {
      setData(prev)
      toast.error('Perubahan gagal disimpan.')
    }
  }

  // Opening an unread message marks it read (once per message per visit).
  useEffect(() => {
    if (!selected || selected.status !== 'unread' || autoRead.current.has(selected.id)) return
    autoRead.current.add(selected.id)
    void patch(selected, { status: 'read' })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run per opened message, not per patch identity
  }, [selected?.id, selected?.status])

  const toggleRead = (m: Inbox) => void patch(m, { status: m.status === 'unread' ? 'read' : 'unread' })
  const toggleImportant = (m: Inbox) => void patch(m, { is_important: !m.is_important })
  const toggleArchive = (m: Inbox) =>
    m.status === 'archived'
      ? void patch(m, { status: 'read' }, { message: 'Dikembalikan ke kotak masuk' })
      : void patch(m, { status: 'archived' }, { message: 'Pesan diarsipkan', undo: { status: m.status } })

  const remove = async (m: Inbox) => {
    const prev = data
    setData((rs) => rs?.filter((r) => r.id !== m.id) ?? rs)
    if (selectedId === m.id) navigate('/inbox', { replace: true })
    try {
      await deleteInbox(m.id)
      syncStore()
      toast.success('Pesan dihapus')
    } catch {
      setData(prev)
      toast.error('Pesan gagal dihapus.')
    }
  }

  const sendReply = async (m: Inbox, body: string) => {
    try {
      const saved = await replyInbox(m.id, body)
      setData((rs) => rs?.map((r) => (r.id === m.id ? saved : r)) ?? rs)
      syncStore()
      setReplyTo(null)
      toast.success(`Balasan terkirim ke ${m.sender_name}`)
    } catch (e) {
      toast.error('Balasan gagal dikirim.')
      throw e
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Engagement" title="Inbox" description="Pesan dari formulir kontak situs publik." />

      <div className="overflow-hidden rounded-xl border bg-card lg:grid lg:h-[calc(100dvh-15rem)] lg:min-h-[32rem] lg:grid-cols-[360px_minmax(0,1fr)]">
        <section aria-label="Daftar pesan" className={cn('min-h-0 flex-col lg:flex lg:border-r', selected ? 'hidden' : 'flex')}>
          <Tabs value={tab} onValueChange={(v) => setTab(v as InboxTab)} className="min-h-0 flex-1 gap-0">
            <div className="overflow-x-auto border-b px-2">
              <TabsList variant="line" className="h-11 w-full min-w-max justify-start">
                {TABS.map((t) => (
                  <TabsTrigger key={t.value} value={t.value} className="flex-none px-2 text-[13px]">
                    {t.label}
                    <span className="rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground tabular-nums">{data ? counts[t.value] : '–'}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <TabsContent value={tab} className="min-h-0 overflow-y-auto" tabIndex={-1}>
              {error && !data ? (
                <div className="p-4">
                  <EmptyState icon={RotateCcw} title="Gagal memuat pesan" description={error.message} action={<Button variant="outline" onClick={reload}>Coba lagi</Button>} />
                </div>
              ) : !data ? (
                <MessageListSkeleton />
              ) : visible.length === 0 ? (
                <div className="p-4"><EmptyState icon={MailX} title={EMPTY_COPY[tab]} /></div>
              ) : (
                <MessageList
                  items={visible}
                  selectedId={selectedId}
                  onSelect={select}
                  onToggleImportant={toggleImportant}
                  label={`${TABS.find((t) => t.value === tab)?.label}: ${visible.length} pesan`}
                />
              )}
            </TabsContent>
          </Tabs>
        </section>

        <section aria-label="Isi pesan" className={cn('min-h-0 flex-col lg:flex', selected ? 'flex min-h-[70dvh] lg:min-h-0' : 'hidden')}>
          {selected ? (
            <MessageDetail
              message={selected}
              onBack={back}
              onToggleRead={toggleRead}
              onToggleImportant={toggleImportant}
              onToggleArchive={toggleArchive}
              onDelete={(m) => void remove(m)}
              onReply={setReplyTo}
            />
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <InboxIcon className="size-6" aria-hidden />
                <p className="text-sm">Pilih pesan untuk membaca isinya.</p>
              </div>
            </div>
          )}
        </section>
      </div>

      <ReplyDialog message={replyTo} onClose={() => setReplyTo(null)} onSend={sendReply} />
    </div>
  )
}
