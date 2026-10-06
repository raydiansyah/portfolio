import { BriefcaseBusiness, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Experience } from '@/types/supabase'
import { deleteExperience, listExperiences } from '../../data/repo'
import { ConfirmDelete } from '../../ui/ConfirmDelete'
import { EmptyState } from '../../ui/EmptyState'
import { PageHeader } from '../../ui/PageHeader'
import { useResource } from '../../ui/useResource'
import { ExperienceDialog } from './ExperienceDialog'

const period = (x: Experience) => `${x.start_year} — ${x.end_year ?? 'Now'}`

/** Work & teaching history, rendered in the harbor's Experience panel. */
export default function ExperienceModule() {
  const { data, error, reload, setData } = useResource(listExperiences)
  const [editing, setEditing] = useState<Experience | null>(null)
  const [creating, setCreating] = useState(false)
  const rows = data ?? []

  const onDelete = async (x: Experience) => {
    setData((d) => d?.filter((r) => r.id !== x.id) ?? d)
    try {
      await deleteExperience(x.id)
      toast.success(`${x.role} removed`)
    } catch {
      reload()
      toast.error('Could not delete.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Content"
        title="Experience"
        description="Roles and teaching history. Current roles appear first, then by start year."
        actions={<Button size="lg" onClick={() => setCreating(true)}><Plus aria-hidden />Add experience</Button>}
      />

      {error && <p role="alert" className="text-sm text-destructive">Could not load experience. <button className="underline" onClick={reload}>Retry</button></p>}

      {!data && !error && (
        <ol className="flex flex-col gap-3" aria-busy="true" aria-label="Loading experience">
          {Array.from({ length: 3 }, (_, i) => <li key={i}><Skeleton className="h-28 rounded-lg" /></li>)}
        </ol>
      )}

      {data && rows.length === 0 && (
        <EmptyState
          icon={BriefcaseBusiness}
          title="No experience yet"
          description="Add your roles so visitors see them at the Experience harbor."
          action={<Button onClick={() => setCreating(true)}><Plus aria-hidden />Add experience</Button>}
        />
      )}

      {rows.length > 0 && (
        <ol className="flex flex-col gap-3">
          {rows.map((x) => (
            <li key={x.id} className="flex min-h-28 flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-start sm:gap-6">
              <p className="w-32 shrink-0 font-mono text-sm tabular-nums text-muted-foreground">{period(x)}</p>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{x.role}</h2>
                  {x.end_year === null && <Badge variant="secondary" className="font-normal">Current</Badge>}
                  {!x.is_published && <Badge variant="outline" className="font-normal text-muted-foreground"><EyeOff aria-hidden />Hidden</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{x.organization}{x.location ? ` · ${x.location}` : ''}</p>
                {x.summary && <p className="mt-2 line-clamp-2 text-sm">{x.summary}</p>}
                {x.stack.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Stack">
                    {x.stack.map((s) => <li key={s}><Badge variant="outline" className="font-normal">{s}</Badge></li>)}
                  </ul>
                )}
              </div>
              <div className="flex shrink-0 gap-1 self-end sm:self-start">
                <Button variant="ghost" size="icon" aria-label={`Edit ${x.role}`} onClick={() => setEditing(x)}><Pencil aria-hidden /></Button>
                <ConfirmDelete title={`Delete “${x.role}”?`} description="It disappears from the Experience harbor." onConfirm={() => onDelete(x)}>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${x.role}`} className="text-muted-foreground hover:text-destructive"><Trash2 aria-hidden /></Button>
                </ConfirmDelete>
              </div>
            </li>
          ))}
        </ol>
      )}

      <ExperienceDialog
        open={creating || editing !== null}
        experience={editing}
        nextOrder={rows.length}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false)
            setEditing(null)
          }
        }}
        onSaved={() => {
          setCreating(false)
          setEditing(null)
          reload()
        }}
      />
    </div>
  )
}
