import { Briefcase, Plus, RotateCcw, Search, SearchX } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useLocation, useSearch } from 'wouter'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Portfolio } from '@/types/supabase'
import { createPortfolio, deletePortfolio, listPortfolios, updatePortfolio } from '../../data/repo'
import { EmptyState } from '../../ui/EmptyState'
import { PageHeader } from '../../ui/PageHeader'
import { useResource } from '../../ui/useResource'
import { applyQuery, categoryCounts, SORT_LABELS, useDebounced, type SortKey, type StatusFilter } from './helpers'
import { PortfolioCard } from './PortfolioCard'
import { PortfolioDialog, type PortfolioDraft } from './PortfolioDialog'
import { PortfolioGridSkeleton } from './PortfolioGridSkeleton'
import { PortfolioPreview } from './PortfolioPreview'

const chip =
  'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background hover:bg-muted aria-pressed:hover:bg-foreground/90'

export default function PortfolioModule() {
  const { data, error, reload, setData } = useResource(listPortfolios)
  const search = useSearch()
  const [, navigate] = useLocation()

  const [category, setCategory] = useState<string | null>(null)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<SortKey>('latest')
  const [query, setQuery] = useState('')
  const debounced = useDebounced(query, 200)

  const [dialog, setDialog] = useState<{ open: boolean; item: Portfolio | null }>({ open: false, item: null })
  const [preview, setPreview] = useState<Portfolio | null>(null)

  // `?new=1` (from the dashboard quick action / command menu) opens the create dialog, then is stripped.
  const wantsNew = new URLSearchParams(search).has('new')
  const [handledNew, setHandledNew] = useState(false)
  if (wantsNew !== handledNew) {
    setHandledNew(wantsNew)
    if (wantsNew) setDialog({ open: true, item: null })
  }
  useEffect(() => {
    if (wantsNew) navigate('/portfolio', { replace: true })
  }, [wantsNew, navigate])

  const rows = useMemo(() => data ?? [], [data])
  const counts = useMemo(() => categoryCounts(rows), [rows])
  const categories = useMemo(() => counts.map(([c]) => c).sort(), [counts])
  const visible = useMemo(() => applyQuery(rows, { category, status, search: debounced, sort }), [rows, category, status, debounced, sort])
  const nextOrder = useMemo(() => rows.reduce((m, r) => Math.max(m, r.order_index + 1), 0), [rows])
  const filtered = category !== null || status !== 'all' || debounced.trim() !== ''

  const clearFilters = () => {
    setCategory(null)
    setStatus('all')
    setQuery('')
  }

  /** Optimistic patch: apply locally, persist, reconcile with the server row or revert. */
  const patch = async (id: string, changes: Partial<Portfolio>, success?: string) => {
    const prev = data
    setData((rs) => rs?.map((r) => (r.id === id ? { ...r, ...changes } : r)) ?? rs)
    try {
      const saved = await updatePortfolio(id, changes)
      setData((rs) => rs?.map((r) => (r.id === id ? saved : r)) ?? rs)
      if (success) toast.success(success)
    } catch {
      setData(prev)
      toast.error('Could not save changes.')
    }
  }

  const publishFields = (p: Pick<Portfolio, 'published_at'>, next: Portfolio['status']) =>
    next === 'published' && !p.published_at ? { status: next, published_at: new Date().toISOString() } : { status: next }

  const togglePublish = (p: Portfolio) => {
    const next = p.status === 'published' ? 'draft' : 'published'
    void patch(p.id, publishFields(p, next), next === 'published' ? `“${p.title}” published` : `“${p.title}” moved to drafts`)
  }

  const remove = async (p: Portfolio) => {
    const prev = data
    setData((rs) => rs?.filter((r) => r.id !== p.id) ?? rs)
    if (preview?.id === p.id) setPreview(null)
    try {
      await deletePortfolio(p.id)
      toast.success(`“${p.title}” deleted`)
    } catch {
      setData(prev)
      toast.error('Could not delete the project.')
    }
  }

  const save = async (draft: PortfolioDraft) => {
    const editing = dialog.item
    if (editing) {
      setDialog({ open: false, item: editing })
      await patch(editing.id, { ...draft, ...publishFields(editing, draft.status) }, 'Project updated')
      return
    }
    try {
      const created = await createPortfolio(draft)
      setData((rs) => (rs ? [created, ...rs] : [created]))
      setDialog({ open: false, item: null })
      toast.success(`“${created.title}” created`)
    } catch {
      toast.error('Could not create the project.')
    }
  }

  const openEdit = (p: Portfolio) => {
    setPreview(null)
    setDialog({ open: true, item: p })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Content"
        title="Portofolio"
        description="Projects shown on the public harbor. Drafts stay private until published."
        actions={<Button onClick={() => setDialog({ open: true, item: null })}><Plus /> New project</Button>}
      />

      <div className="flex flex-col gap-3 border-b pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div role="group" aria-label="Filter by category" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0">
            <button type="button" className={chip} aria-pressed={category === null} onClick={() => setCategory(null)}>
              All <span className="tabular-nums opacity-70">({rows.length})</span>
            </button>
            {counts.map(([c, n]) => (
              <button key={c} type="button" className={chip} aria-pressed={category === c} onClick={() => setCategory(category === c ? null : c)}>
                {c} <span className="tabular-nums opacity-70">({n})</span>
              </button>
            ))}
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger size="sm" className="w-36" aria-label="Filter by status"><SelectValue /></SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1 basis-56">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, summary, tech…" aria-label="Search projects" className="pl-8" />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-32" aria-label="Sort projects"><SelectValue /></SelectTrigger>
            <SelectContent align="end">
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => <SelectItem key={k} value={k}>{SORT_LABELS[k]}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
            {data ? `${visible.length} ${visible.length === 1 ? 'result' : 'results'}` : ' '}
          </p>
        </div>
      </div>

      {error && !data ? (
        <EmptyState icon={RotateCcw} title="Could not load projects" description={error.message} action={<Button variant="outline" onClick={reload}>Retry</Button>} />
      ) : !data ? (
        <PortfolioGridSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No projects yet"
          description="Add your first project to start filling the public portfolio."
          action={<Button onClick={() => setDialog({ open: true, item: null })}><Plus /> New project</Button>}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No matching projects"
          description="Nothing fits the current filters."
          action={filtered && <Button variant="outline" onClick={clearFilters}>Clear filters</Button>}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((p) => (
            <li key={p.id} className="flex">
              <PortfolioCard item={p} onEdit={openEdit} onPreview={setPreview} onTogglePublish={togglePublish} onDelete={(x) => void remove(x)} />
            </li>
          ))}
        </ul>
      )}

      <PortfolioDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        item={dialog.item}
        categories={categories}
        nextOrder={nextOrder}
        onSubmit={save}
      />
      <PortfolioPreview item={preview} onClose={() => setPreview(null)} onEdit={openEdit} />
    </div>
  )
}
