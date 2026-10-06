import { LayoutGrid, List, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import type { Skill, SkillCategory } from '@/types/supabase'
import { createSkill, deleteSkill, listSkills, updateSkill } from '../../data/repo'
import { useAdminStore } from '../../store'
import { ConfirmDelete } from '../../ui/ConfirmDelete'
import { EmptyState } from '../../ui/EmptyState'
import { PageHeader } from '../../ui/PageHeader'
import { useResource } from '../../ui/useResource'
import { SkillDialog, type SkillValues } from './SkillDialog'
import { CATEGORY_LABEL, SKILL_CATEGORIES, initials } from './skillMeta'

type View = 'grid' | 'list'
const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')

function SkillIcon({ skill, size = 'md' }: { skill: Skill; size?: 'md' | 'sm' }) {
  const box = size === 'md' ? 'size-10 text-sm' : 'size-8 text-xs'
  return skill.icon_url ? (
    <img src={skill.icon_url} alt="" width={40} height={40} className={cn(box, 'shrink-0 rounded-md border bg-background object-contain p-1.5')} />
  ) : (
    <span aria-hidden className={cn(box, 'grid shrink-0 place-items-center rounded-md border bg-muted font-mono font-medium')}>{initials(skill.name)}</span>
  )
}

function Level({ skill }: { skill: Skill }) {
  return (
    <div className="flex items-center gap-3">
      <Progress value={skill.level} aria-label={`${skill.name} proficiency`} aria-valuetext={`${skill.level}%`} className="h-1.5" />
      <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums">{skill.level}%</span>
    </div>
  )
}

export default function SkillsModule() {
  const { data, error, reload, setData } = useResource(listSkills)
  const [filter, setFilter] = useState<SkillCategory | 'all'>('all')
  const [view, setView] = useState<View>('grid')
  const [dialog, setDialog] = useState<{ open: boolean; target: Skill | null; key: number }>({ open: false, target: null, key: 0 })

  const openDialog = (target: Skill | null) => setDialog((d) => ({ open: true, target, key: d.key + 1 }))
  const counts = (data ?? []).reduce<Partial<Record<SkillCategory, number>>>((acc, s) => ({ ...acc, [s.category]: (acc[s.category] ?? 0) + 1 }), {})
  const visible = (data ?? []).filter((s) => filter === 'all' || s.category === filter)

  const submit = async (values: SkillValues) => {
    try {
      if (dialog.target) {
        const row = await updateSkill(dialog.target.id, values)
        setData((rows) => rows?.map((r) => (r.id === row.id ? row : r)) ?? rows)
        toast.success('Skill updated')
      } else {
        const order_index = (data ?? []).reduce((m, s) => Math.max(m, s.order_index + 1), 0)
        const row = await createSkill({ ...values, order_index })
        setData((rows) => [...(rows ?? []), row])
        toast.success('Skill created')
        void useAdminStore.getState().refresh()
      }
      setDialog((d) => ({ ...d, open: false }))
    } catch (e) {
      toast.error(errMsg(e))
    }
  }

  const remove = async (s: Skill) => {
    try {
      await deleteSkill(s.id)
      setData((rows) => rows?.filter((r) => r.id !== s.id) ?? rows)
      toast.success(`Deleted ${s.name}`)
      void useAdminStore.getState().refresh()
    } catch (e) {
      toast.error(errMsg(e))
    }
  }

  const actions = (s: Skill) => (
    <div className="flex shrink-0 gap-1">
      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${s.name}`} onClick={() => openDialog(s)}><Pencil aria-hidden /></Button>
      <ConfirmDelete title={`Delete “${s.name}”?`} onConfirm={() => void remove(s)}>
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${s.name}`} className="hover:text-destructive"><Trash2 aria-hidden /></Button>
      </ConfirmDelete>
    </div>
  )

  const chip = (value: SkillCategory | 'all', label: string, count: number) => (
    <button
      key={value}
      type="button"
      aria-pressed={filter === value}
      onClick={() => setFilter(value)}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        filter === value ? 'border-foreground bg-foreground text-background' : 'hover:bg-muted',
      )}
    >
      {label}
      <span className={cn('font-mono text-xs tabular-nums', filter === value ? 'opacity-80' : 'text-muted-foreground')}>{count}</span>
    </button>
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Content"
        title="Skills"
        description="Tools and disciplines shown on the public site, with proficiency levels."
        actions={<Button onClick={() => openDialog(null)}><Plus aria-hidden />New skill</Button>}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          {chip('all', 'All', data?.length ?? 0)}
          {SKILL_CATEGORIES.filter((c) => counts[c]).map((c) => chip(c, CATEGORY_LABEL[c], counts[c] ?? 0))}
        </div>
        <ToggleGroup type="single" variant="outline" spacing={0} value={view} onValueChange={(v) => v && setView(v as View)} aria-label="Layout">
          <ToggleGroupItem value="grid" aria-label="Grid view"><LayoutGrid aria-hidden /></ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="Compact list view"><List aria-hidden /></ToggleGroupItem>
        </ToggleGroup>
      </div>

      {error ? (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-destructive/40 p-4 text-sm">
          <span>Could not load skills: {error.message}</span>
          <Button variant="outline" size="sm" onClick={reload}>Retry</Button>
        </div>
      ) : !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading skills">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[124px] rounded-xl" />)}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={data.length ? 'No skills in this category' : 'No skills yet'}
          action={<Button onClick={() => openDialog(null)}><Plus aria-hidden />New skill</Button>}
        />
      ) : view === 'grid' ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((s) => (
            <li key={s.id} className="flex h-[124px] flex-col justify-between rounded-xl border bg-card p-4">
              <div className="flex items-start gap-3">
                <SkillIcon skill={s} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.name}</p>
                  <Badge variant="secondary" className="mt-1">{CATEGORY_LABEL[s.category]}</Badge>
                </div>
                {actions(s)}
              </div>
              <Level skill={s} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {visible.map((s) => (
            <li key={s.id} className="flex h-14 items-center gap-3 px-3">
              <SkillIcon skill={s} size="sm" />
              <p className="min-w-0 flex-1 truncate text-sm font-medium">{s.name}</p>
              <span className="hidden w-24 text-xs text-muted-foreground sm:block">{CATEGORY_LABEL[s.category]}</span>
              <div className="w-28 sm:w-40"><Level skill={s} /></div>
              {actions(s)}
            </li>
          ))}
        </ul>
      )}

      <SkillDialog
        key={dialog.key}
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        skill={dialog.target}
        onSubmit={submit}
      />
    </div>
  )
}
