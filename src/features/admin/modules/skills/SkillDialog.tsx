import { Loader2 } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { STORAGE_BUCKETS, type Skill, type SkillCategory } from '@/types/supabase'
import { uploadPublicFile } from '../../data/repo'
import { Dropzone } from '../../ui/Dropzone'
import { CATEGORY_LABEL, SKILL_CATEGORIES } from './skillMeta'

export type SkillValues = Pick<Skill, 'name' | 'category' | 'level' | 'icon_url'>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  skill: Skill | null
  onSubmit: (values: SkillValues) => Promise<void>
}

/** Create/edit dialog. Remount with a new `key` to reset the draft. */
export function SkillDialog({ open, onOpenChange, skill, onSubmit }: Props) {
  const id = useId()
  const [v, setV] = useState<SkillValues>(() =>
    skill ? { name: skill.name, category: skill.category, level: skill.level, icon_url: skill.icon_url } : { name: '', category: 'frontend', level: 70, icon_url: null },
  )
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const nameError = touched && !v.name.trim() ? 'Name is required.' : null
  const set = <K extends keyof SkillValues>(k: K, val: SkillValues[K]) => setV((p) => ({ ...p, [k]: val }))

  const upload = async (file: File) => {
    setUploading(true)
    try {
      set('icon_url', await uploadPublicFile(STORAGE_BUCKETS.skillIcons, 'icons', file))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!v.name.trim()) return
    setSaving(true)
    try {
      await onSubmit({ ...v, name: v.name.trim() })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{skill ? 'Edit skill' : 'New skill'}</DialogTitle>
            <DialogDescription>Listed in the About section with its proficiency level.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-name`}>Name *</Label>
              <Input
                id={`${id}-name`}
                value={v.name}
                onChange={(e) => set('name', e.target.value)}
                aria-invalid={!!nameError || undefined}
                aria-describedby={nameError ? `${id}-name-err` : undefined}
                autoFocus
              />
              {nameError && <p id={`${id}-name-err`} className="text-xs text-destructive">{nameError}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-cat`}>Category</Label>
              <Select value={v.category} onValueChange={(x) => set('category', x as SkillCategory)}>
                <SelectTrigger id={`${id}-cat`} className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SKILL_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={`${id}-level`}>Level</Label>
              <output htmlFor={`${id}-level`} className="font-mono text-sm tabular-nums">{v.level}%</output>
            </div>
            <input
              id={`${id}-level`}
              type="range"
              min={0}
              max={100}
              step={5}
              value={v.level}
              onChange={(e) => set('level', Number(e.target.value))}
              aria-valuetext={`${v.level} percent`}
              className="h-2 w-full cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
          </div>

          <Dropzone
            label="Icon"
            accept="image/svg+xml,image/png,image/webp"
            maxMb={1}
            aspect="square"
            hint={uploading ? 'Uploading…' : 'SVG or PNG, max 1 MB. Initials are used when empty.'}
            preview={v.icon_url}
            onFile={(f) => void upload(f)}
            onClear={() => set('icon_url', null)}
          />

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving && <Loader2 className="motion-safe:animate-spin" aria-hidden />}
              {skill ? 'Save changes' : 'Create skill'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
