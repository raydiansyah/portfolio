import { Library, Lock, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Link, useLocation, useSearch } from 'wouter'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import type { ContentModule } from '@/types/supabase'
import { deleteModule, listModules, type ModuleWithStats } from '../../data/modules'
import { ConfirmDelete } from '../../ui/ConfirmDelete'
import { EmptyState } from '../../ui/EmptyState'
import { PageHeader } from '../../ui/PageHeader'
import { useResource } from '../../ui/useResource'
import { MODULE_LABELS } from '../slides/shared'
import { ModuleDetail } from './ModuleDetail'
import { ModuleDialog } from './ModuleDialog'

/**
 * Content modules: courses, client engagements and workshop series that
 * organise many slides. `?id=<module>` opens the detail view (back/forward safe).
 */
export default function ContentModulesModule() {
  const search = useSearch()
  const [, navigate] = useLocation()
  const { data, error, reload, setData } = useResource(listModules)
  const [editing, setEditing] = useState<ContentModule | null>(null)
  const [creating, setCreating] = useState(false)

  const selectedId = new URLSearchParams(search).get('id')
  const modules = useMemo(() => data ?? [], [data])
  const selected = modules.find((m) => m.id === selectedId) ?? null
  const titles = useMemo(() => Object.fromEntries(modules.map((m) => [m.id, m.title])), [modules])

  const onSaved = (saved: ContentModule) => {
    setCreating(false)
    setEditing(null)
    reload()
    if (!selectedId) navigate(`/modules?id=${saved.id}`)
  }

  const onDelete = async (m: ModuleWithStats) => {
    setData((d) => d?.filter((x) => x.id !== m.id) ?? d)
    try {
      await deleteModule(m.id)
      toast.success(`${m.title} deleted. Its ${m.slide_count} slides are kept as unassigned.`)
      if (selectedId === m.id) navigate('/modules')
    } catch {
      reload()
      toast.error('Could not delete the module.')
    }
  }

  const dialog = (
    <ModuleDialog
      open={creating || editing !== null}
      module={editing}
      takenSlugs={modules.map((m) => m.slug)}
      nextOrder={modules.length}
      onOpenChange={(o) => {
        if (!o) {
          setCreating(false)
          setEditing(null)
        }
      }}
      onSaved={onSaved}
    />
  )

  if (selectedId && selected) {
    return (
      <>
        <ModuleDetail key={selected.id} module={selected} moduleTitles={titles} onEdit={() => setEditing(selected)} onChanged={reload} />
        {dialog}
      </>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Content"
        title="Modules"
        description="Group many slides into a course, client engagement or workshop series — each with one shareable page."
        actions={<Button size="lg" onClick={() => setCreating(true)}><Plus aria-hidden />New module</Button>}
      />

      {error && <p role="alert" className="text-sm text-destructive">Could not load modules. <button className="underline" onClick={reload}>Retry</button></p>}

      {!data && !error && (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading modules">
          {Array.from({ length: 3 }, (_, i) => <li key={i}><Skeleton className="h-52 rounded-lg" /></li>)}
        </ul>
      )}

      {data && modules.length === 0 && (
        <EmptyState
          icon={Library}
          title="No modules yet"
          description="Create a module for a course or client, then add its slides in order."
          action={<Button onClick={() => setCreating(true)}><Plus aria-hidden />New module</Button>}
        />
      )}

      {modules.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((m) => (
            <li key={m.id}>
              <ModuleCard module={m} onEdit={() => setEditing(m)} onDelete={() => onDelete(m)} />
            </li>
          ))}
        </ul>
      )}
      {dialog}
    </div>
  )
}

function ModuleCard({ module: m, onEdit, onDelete }: { module: ModuleWithStats; onEdit: () => void; onDelete: () => void }) {
  const deleteBtn = useRef<HTMLButtonElement>(null)
  return (
    <article className="group relative flex h-52 flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:border-foreground/30">
      <div className="relative h-20 shrink-0 overflow-hidden border-b bg-muted">
        {m.cover_url ? (
          <img src={m.cover_url} alt="" className="size-full object-cover" width={400} height={80} loading="lazy" />
        ) : (
          <span className="absolute bottom-2 left-4 font-mono text-3xl font-semibold text-muted-foreground/60" aria-hidden>
            {m.title.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="font-normal">{MODULE_LABELS[m.category]}</Badge>
          {!m.is_published && <Badge variant="outline" className="font-normal text-muted-foreground">Draft</Badge>}
        </div>
        <h2 className="truncate font-semibold">
          {/* Stretched link: the whole card opens the module; menu sits above it. */}
          <Link href={`/modules?id=${m.id}`} className="outline-none after:absolute after:inset-0 focus-visible:underline">
            {m.title}
          </Link>
        </h2>
        <p className="font-mono text-xs text-muted-foreground">
          {m.slide_count} {m.slide_count === 1 ? 'slide' : 'slides'} · {m.active_count} active
          {m.access_code && (
            <span className="ml-1.5 inline-flex items-center gap-1 align-middle">
              · <Lock className="size-3" aria-hidden />
              {m.access_expires_at ? `locked until ${new Date(m.access_expires_at).toLocaleDateString()}` : 'locked'}
            </span>
          )}
        </p>
      </div>
      <div className="absolute top-2 right-2 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="size-9" aria-label={`Actions for ${m.title}`}><MoreHorizontal aria-hidden /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}><Pencil aria-hidden />Edit</DropdownMenuItem>
            {/* AlertDialog can't live inside the menu (it unmounts on close), so trigger a hidden button. */}
            <DropdownMenuItem variant="destructive" onSelect={() => setTimeout(() => deleteBtn.current?.click())}>
              <Trash2 aria-hidden />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ConfirmDelete
          title={`Delete “${m.title}”?`}
          description={`The module page goes away. Its ${m.slide_count} slides are kept and become unassigned.`}
          onConfirm={onDelete}
        >
          <button ref={deleteBtn} type="button" className="sr-only" tabIndex={-1} aria-hidden>Delete</button>
        </ConfirmDelete>
      </div>
    </article>
  )
}
