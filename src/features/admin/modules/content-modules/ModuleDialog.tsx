import { Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { STORAGE_BUCKETS, type ContentModule, type SlideModule } from '@/types/supabase'
import { createModule, updateModule } from '../../data/modules'
import { uploadPublicFile } from '../../data/repo'
import { Dropzone } from '../../ui/Dropzone'
import { MODULES, MODULE_LABELS, SLUG_RE, fieldA11y, slugify } from '../slides/shared'

interface Props {
  open: boolean
  /** null = create. */
  module: ContentModule | null
  takenSlugs: string[]
  nextOrder: number
  onOpenChange: (open: boolean) => void
  onSaved: (module: ContentModule) => void
}

export function ModuleDialog({ open, onOpenChange, ...rest }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {/* Keyed body: each open starts from fresh form state. */}
        {open && <ModuleForm key={rest.module?.id ?? 'new'} onOpenChange={onOpenChange} {...rest} />}
      </DialogContent>
    </Dialog>
  )
}

type Errors = Partial<Record<'title' | 'slug', string>>

function ModuleForm({ module, takenSlugs, nextOrder, onOpenChange, onSaved }: Omit<Props, 'open'>) {
  const [title, setTitle] = useState(module?.title ?? '')
  const [slug, setSlug] = useState(module?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(Boolean(module))
  const [description, setDescription] = useState(module?.description ?? '')
  const [category, setCategory] = useState<SlideModule>(module?.category ?? 'materi_kuliah')
  const [published, setPublished] = useState(module?.is_published ?? false)
  const [cover, setCover] = useState<string | null>(module?.cover_url ?? null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Errors>({})

  const validate = (): Errors => {
    const e: Errors = {}
    if (!title.trim()) e.title = 'Title is required.'
    if (!SLUG_RE.test(slug)) e.slug = 'Use lowercase letters, numbers and dashes only.'
    else if (takenSlugs.includes(slug) && slug !== module?.slug) e.slug = 'Another module already uses this slug.'
    return e
  }

  const onCover = async (file: File) => {
    setUploading(true)
    try {
      setCover(await uploadPublicFile(STORAGE_BUCKETS.branding, 'modules', file))
    } catch {
      toast.error('Cover upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    const draft = {
      slug, title: title.trim(), description: description.trim() || null, category,
      cover_url: cover, is_published: published, order_index: module?.order_index ?? nextOrder,
    }
    setSaving(true)
    try {
      const saved = module ? await updateModule(module.id, draft) : await createModule(draft)
      toast.success(module ? 'Module updated' : 'Module created')
      onSaved(saved)
    } catch {
      toast.error('Could not save the module.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle>{module ? 'Edit module' : 'New module'}</DialogTitle>
        <DialogDescription>A module groups the decks of one course, client or workshop under a single link.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="module-title" className="text-sm font-medium">Title</label>
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            if (!slugTouched) setSlug(slugify(e.target.value))
          }}
          {...fieldA11y('module-title', errors.title)}
        />
        {errors.title && <p id="module-title-error" role="alert" className="text-xs text-destructive">{errors.title}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="module-slug" className="text-sm font-medium">Public link</label>
        <div className="flex items-center rounded-md border focus-within:ring-2 focus-within:ring-ring/50">
          <span className="pl-3 font-mono text-xs text-muted-foreground">/slides/m/</span>
          <input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true)
              setSlug(e.target.value.toLowerCase())
            }}
            className="h-9 min-w-0 flex-1 bg-transparent pr-3 font-mono text-sm outline-none"
            {...fieldA11y('module-slug', errors.slug)}
          />
        </div>
        {errors.slug && <p id="module-slug-error" role="alert" className="text-xs text-destructive">{errors.slug}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="module-description" className="text-sm font-medium">Description</label>
        <Textarea id="module-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="module-category" className="text-sm font-medium">Category</label>
        <Select value={category} onValueChange={(v) => setCategory(v as SlideModule)}>
          <SelectTrigger id="module-category" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MODULES.map((m) => <SelectItem key={m} value={m}>{MODULE_LABELS[m]}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Slides added to this module adopt its category.</p>
      </div>

      <Dropzone
        label="Cover image"
        accept="image/*"
        maxMb={3}
        aspect="wide"
        hint={uploading ? 'Uploading…' : '16:9, max 3 MB'}
        preview={cover}
        onFile={onCover}
        onClear={() => setCover(null)}
      />

      <label className="flex items-center justify-between gap-4 rounded-md border p-3">
        <span className="grid">
          <span className="text-sm font-medium">Published</span>
          <span className="text-xs text-muted-foreground">Visible at its public link. Each deck keeps its own access code.</span>
        </span>
        <Switch checked={published} onCheckedChange={setPublished} aria-label="Published" />
      </label>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button type="submit" disabled={saving || uploading}>
          {saving && <Loader2 className="animate-spin" aria-hidden />}
          {module ? 'Save changes' : 'Create module'}
        </Button>
      </DialogFooter>
    </form>
  )
}
