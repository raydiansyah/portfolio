import { Loader2 } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { STORAGE_BUCKETS, type Portfolio } from '@/types/supabase'
import { uploadPublicFile } from '../../data/repo'
import { Dropzone } from '../../ui/Dropzone'
import { SLUG_RE, slugify } from './helpers'
import { TechInput } from './TechInput'

export type PortfolioDraft = Omit<Portfolio, 'id' | 'created_at' | 'updated_at' | 'view_count' | 'published_at'>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = create */
  item: Portfolio | null
  categories: string[]
  nextOrder: number
  onSubmit: (draft: PortfolioDraft) => Promise<void>
}

const NEW_CATEGORY = '__new__'
const isUrl = (v: string) => !v || /^https?:\/\/\S+$/i.test(v)

function initialDraft(item: Portfolio | null, nextOrder: number, categories: string[]): PortfolioDraft {
  if (item) {
    const { title, slug, category, summary, description, thumbnail_url, tech_stack, live_url, repo_url, status, featured, order_index } = item
    return { title, slug, category, summary, description, thumbnail_url, tech_stack, live_url, repo_url, status, featured, order_index }
  }
  return {
    title: '', slug: '', category: categories[0] ?? 'Web', summary: '', description: '', thumbnail_url: null,
    tech_stack: [], live_url: '', repo_url: '', status: 'draft', featured: false, order_index: nextOrder,
  }
}

/** Form lives inside DialogContent so it remounts (fresh state) every time the dialog opens. */
function PortfolioForm({ item, categories, nextOrder, onSubmit, onCancel }: Omit<Props, 'open' | 'onOpenChange'> & { onCancel: () => void }) {
  const uid = useId()
  const f = (name: string) => `${uid}-${name}`
  const [draft, setDraft] = useState(() => initialDraft(item, nextOrder, categories))
  const [slugTouched, setSlugTouched] = useState(Boolean(item))
  const [customCategory, setCustomCategory] = useState(() => Boolean(item && !categories.includes(item.category)))
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const set = <K extends keyof PortfolioDraft>(k: K, v: PortfolioDraft[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const errors: Partial<Record<'title' | 'slug' | 'category' | 'live_url' | 'repo_url', string>> = {}
  if (!draft.title.trim()) errors.title = 'Title is required.'
  if (!SLUG_RE.test(draft.slug)) errors.slug = 'Use lowercase letters, numbers and hyphens only.'
  if (!draft.category.trim()) errors.category = 'Category is required.'
  if (!isUrl(draft.live_url ?? '')) errors.live_url = 'Must start with http:// or https://'
  if (!isUrl(draft.repo_url ?? '')) errors.repo_url = 'Must start with http:// or https://'
  const show = (k: keyof typeof errors) => (submitted ? errors[k] : undefined)

  const onFile = async (file: File) => {
    setUploading(true)
    try {
      set('thumbnail_url', await uploadPublicFile(STORAGE_BUCKETS.portfolioMedia, 'thumbnails', file))
    } catch {
      toast.error('Upload failed. Try again.')
    } finally {
      setUploading(false)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length) return
    setSaving(true)
    try {
      await onSubmit({
        ...draft,
        title: draft.title.trim(),
        category: draft.category.trim(),
        summary: draft.summary?.trim() || null,
        description: draft.description?.trim() || null,
        live_url: draft.live_url?.trim() || null,
        repo_url: draft.repo_url?.trim() || null,
      })
    } finally {
      setSaving(false)
    }
  }

  const fieldError = (k: keyof typeof errors) =>
    show(k) && <p id={f(`${k}-err`)} role="alert" className="text-xs text-destructive">{show(k)}</p>

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-col gap-4">
      <div className="-mx-4 grid min-h-0 gap-4 overflow-y-auto px-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor={f('title')}>Title</Label>
          <Input id={f('title')} value={draft.title} aria-invalid={!!show('title')} aria-describedby={show('title') ? f('title-err') : undefined}
            onChange={(e) => {
              const title = e.target.value
              setDraft((d) => ({ ...d, title, slug: slugTouched ? d.slug : slugify(title) }))
            }} />
          {fieldError('title')}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={f('slug')}>Slug</Label>
          <Input id={f('slug')} value={draft.slug} className="font-mono" aria-invalid={!!show('slug')} aria-describedby={show('slug') ? f('slug-err') : undefined}
            onChange={(e) => {
              setSlugTouched(true)
              set('slug', e.target.value.toLowerCase())
            }} />
          {fieldError('slug')}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={f('category')}>Category</Label>
          {customCategory ? (
            <div className="flex gap-2">
              <Input id={f('category')} value={draft.category} placeholder="New category" autoFocus aria-invalid={!!show('category')} onChange={(e) => set('category', e.target.value)} />
              {categories.length > 0 && (
                <Button type="button" variant="ghost" onClick={() => { setCustomCategory(false); set('category', categories[0]) }}>List</Button>
              )}
            </div>
          ) : (
            <Select value={draft.category} onValueChange={(v) => (v === NEW_CATEGORY ? (setCustomCategory(true), set('category', '')) : set('category', v))}>
              <SelectTrigger id={f('category')} className="w-full"><SelectValue placeholder="Choose" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                <SelectSeparator />
                <SelectItem value={NEW_CATEGORY}>New category…</SelectItem>
              </SelectContent>
            </Select>
          )}
          {fieldError('category')}
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor={f('summary')}>Summary</Label>
          <Input id={f('summary')} value={draft.summary ?? ''} maxLength={200} onChange={(e) => set('summary', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor={f('description')}>Description</Label>
          <Textarea id={f('description')} rows={4} value={draft.description ?? ''} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor={f('tech')}>Tech stack</Label>
          <TechInput id={f('tech')} value={draft.tech_stack} onChange={(v) => set('tech_stack', v)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={f('live_url')}>Live URL</Label>
          <Input id={f('live_url')} type="url" inputMode="url" placeholder="https://" value={draft.live_url ?? ''} aria-invalid={!!show('live_url')} onChange={(e) => set('live_url', e.target.value)} />
          {fieldError('live_url')}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={f('repo_url')}>Repository URL</Label>
          <Input id={f('repo_url')} type="url" inputMode="url" placeholder="https://" value={draft.repo_url ?? ''} aria-invalid={!!show('repo_url')} onChange={(e) => set('repo_url', e.target.value)} />
          {fieldError('repo_url')}
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <Label htmlFor={f('status')} className="flex flex-col items-start gap-0.5">
            Published <span className="text-xs font-normal text-muted-foreground">Visible on the public site</span>
          </Label>
          <Switch id={f('status')} checked={draft.status === 'published'} onCheckedChange={(c) => set('status', c ? 'published' : 'draft')} />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <Label htmlFor={f('featured')} className="flex flex-col items-start gap-0.5">
            Featured <span className="text-xs font-normal text-muted-foreground">Pinned at the top</span>
          </Label>
          <Switch id={f('featured')} checked={draft.featured} onCheckedChange={(c) => set('featured', c)} />
        </div>
        <Dropzone
          className="sm:col-span-2"
          accept="image/*"
          maxMb={3}
          label="Thumbnail"
          hint={uploading ? 'Uploading…' : '16:9 image, max 3 MB'}
          preview={draft.thumbnail_url}
          onFile={(file) => void onFile(file)}
          onClear={() => set('thumbnail_url', null)}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving || uploading}>
          {saving && <Loader2 className="animate-spin" aria-hidden />}
          {item ? 'Save changes' : 'Create project'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function PortfolioDialog({ open, onOpenChange, ...rest }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{rest.item ? 'Edit project' : 'New project'}</DialogTitle>
          <DialogDescription>{rest.item ? 'Update the details shown on the public portfolio.' : 'Add a project to the portfolio. Save as draft until it is ready.'}</DialogDescription>
        </DialogHeader>
        <PortfolioForm {...rest} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
