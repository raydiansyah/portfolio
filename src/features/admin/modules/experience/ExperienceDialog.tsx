import { Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { Experience } from '@/types/supabase'
import { createExperience, updateExperience } from '../../data/repo'
import { TechInput } from '../portfolio/TechInput'

interface Props {
  open: boolean
  /** null = create. */
  experience: Experience | null
  nextOrder: number
  onOpenChange: (open: boolean) => void
  onSaved: (row: Experience) => void
}

export function ExperienceDialog({ open, onOpenChange, ...rest }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {/* Keyed body: each open starts from fresh form state. */}
        {open && <ExperienceForm key={rest.experience?.id ?? 'new'} onOpenChange={onOpenChange} {...rest} />}
      </DialogContent>
    </Dialog>
  )
}

type Errors = Partial<Record<'role' | 'organization' | 'start' | 'end', string>>
const THIS_YEAR = new Date().getFullYear()

function ExperienceForm({ experience: x, nextOrder, onOpenChange, onSaved }: Omit<Props, 'open'>) {
  const [role, setRole] = useState(x?.role ?? '')
  const [organization, setOrganization] = useState(x?.organization ?? '')
  const [start, setStart] = useState(String(x?.start_year ?? THIS_YEAR))
  const [current, setCurrent] = useState(x ? x.end_year === null : true)
  const [end, setEnd] = useState(String(x?.end_year ?? THIS_YEAR))
  const [location, setLocation] = useState(x?.location ?? '')
  const [summary, setSummary] = useState(x?.summary ?? '')
  const [stack, setStack] = useState<string[]>(x?.stack ?? [])
  const [published, setPublished] = useState(x?.is_published ?? true)
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)

  const validate = (): Errors => {
    const e: Errors = {}
    const s = Number(start)
    const en = Number(end)
    if (!role.trim()) e.role = 'Role is required.'
    if (!organization.trim()) e.organization = 'Organisation is required.'
    if (!Number.isInteger(s) || s < 1970 || s > THIS_YEAR + 1) e.start = `Enter a year between 1970 and ${THIS_YEAR + 1}.`
    if (!current && (!Number.isInteger(en) || en < s || en > THIS_YEAR + 1)) e.end = 'End year must be on or after the start year.'
    return e
  }

  const submit = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) {
      // Focus after React has rendered the error state.
      const form = ev.currentTarget
      setTimeout(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    const row = {
      role: role.trim(),
      organization: organization.trim(),
      start_year: Number(start),
      end_year: current ? null : Number(end),
      location: location.trim() || null,
      summary: summary.trim() || null,
      stack,
      is_published: published,
      order_index: x?.order_index ?? nextOrder,
    }
    setSaving(true)
    try {
      const saved = x ? await updateExperience(x.id, row) : await createExperience(row)
      toast.success(x ? 'Experience updated' : 'Experience added')
      onSaved(saved)
    } catch {
      toast.error('Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const field = (id: keyof Errors) => ({
    id: `exp-${id}`,
    'aria-invalid': errors[id] ? true : undefined,
    'aria-describedby': errors[id] ? `exp-${id}-error` : undefined,
  })
  const err = (id: keyof Errors) => errors[id] && <p id={`exp-${id}-error`} className="text-xs text-destructive">{errors[id]}</p>

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle>{x ? 'Edit experience' : 'Add experience'}</DialogTitle>
        <DialogDescription>Shown in the Experience harbor, newest first.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="exp-role" className="text-sm font-medium">Role</label>
        <Input {...field('role')} value={role} onChange={(e) => setRole(e.target.value)} placeholder="Web Developer" />
        {err('role')}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="exp-organization" className="text-sm font-medium">Organisation</label>
        <Input {...field('organization')} value={organization} onChange={(e) => setOrganization(e.target.value)} />
        {err('organization')}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="exp-start" className="text-sm font-medium">Start year</label>
          <Input {...field('start')} type="number" inputMode="numeric" min={1970} max={THIS_YEAR + 1} value={start} onChange={(e) => setStart(e.target.value)} />
          {err('start')}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="exp-end" className="text-sm font-medium">End year</label>
          <Input {...field('end')} type="number" inputMode="numeric" min={1970} max={THIS_YEAR + 1} value={current ? '' : end} placeholder={current ? 'Present' : ''} disabled={current} onChange={(e) => setEnd(e.target.value)} />
          {err('end')}
        </div>
      </div>
      <label className="-mt-2 flex items-center gap-3 text-sm">
        <Switch checked={current} onCheckedChange={setCurrent} aria-label="I currently work here" />
        I currently work here
      </label>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="exp-location" className="text-sm font-medium">Location</label>
        <Input id="exp-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Surabaya / Remote" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="exp-summary" className="text-sm font-medium">Summary</label>
        <Textarea id="exp-summary" rows={4} maxLength={800} value={summary} onChange={(e) => setSummary(e.target.value)} />
        <p className="text-right font-mono text-xs text-muted-foreground">{summary.length}/800</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="exp-stack" className="text-sm font-medium">Stack / skills</label>
        <TechInput id="exp-stack" value={stack} onChange={setStack} />
      </div>

      <label className="flex items-center justify-between gap-4 rounded-md border p-3">
        <span className="grid">
          <span className="text-sm font-medium">Published</span>
          <span className="text-xs text-muted-foreground">Hidden entries stay in the dashboard only.</span>
        </span>
        <Switch checked={published} onCheckedChange={setPublished} aria-label="Published" />
      </label>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="animate-spin" aria-hidden />}
          {x ? 'Save changes' : 'Add experience'}
        </Button>
      </DialogFooter>
    </form>
  )
}
