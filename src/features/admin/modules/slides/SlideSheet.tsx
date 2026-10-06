import { Globe, Loader2, Lock } from 'lucide-react'
import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { ContentModule, Slide, SlideFileType } from '@/types/supabase'
import { createSlide, updateSlide, type SlideDraft } from '../../data/slides'
import { OutlineEditor, type OutlineRow } from './OutlineEditor'
import { SlideFileField } from './SlideFileField'
import { MODULE_LABELS, SLUG_RE, fieldA11y, slugify } from './shared'

interface Props {
  open: boolean
  /** null = create a new slide. */
  slide: Slide | null
  takenSlugs: string[]
  nextOrder: number
  /** Content modules the slide can be filed under. */
  modules: Pick<ContentModule, 'id' | 'title' | 'category' | 'access_code'>[]
  /** Preselected module for new slides (e.g. "Upload into this module"). */
  defaultModuleId?: string | null
  onOpenChange: (open: boolean) => void
  onSaved: (slide: Slide) => void
}

export function SlideSheet({ open, slide, ...rest }: Props) {
  return (
    <Sheet open={open} onOpenChange={rest.onOpenChange}>
      <SheetContent side="right" className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        {/* Keyed body: every open starts from fresh form state. */}
        {open && <SlideForm key={slide?.id ?? 'new'} slide={slide} {...rest} />}
      </SheetContent>
    </Sheet>
  )
}

type Errors = Partial<Record<'title' | 'slug' | 'file' | 'outline', string>>

const NO_MODULE = 'none'

function initialState(s: Slide | null, defaultModule: Pick<ContentModule, 'id'> | undefined) {
  return {
    title: s?.title ?? '',
    slug: s?.slug ?? '',
    slugTouched: Boolean(s),
    description: s?.description ?? '',
    presenter: s?.presenter ?? '',
    moduleId: s ? (s.module_id ?? NO_MODULE) : (defaultModule?.id ?? NO_MODULE),
    fileType: s?.file_type ?? ('html' as SlideFileType),
    filePath: s?.file_url ?? '',
    fileName: s ? (s.file_url.split('/').pop() ?? s.file_url) : '',
    outline: (s?.outline ?? []).map((o): OutlineRow => ({ key: crypto.randomUUID(), title: o.title, page: String(o.page) })),
    allowDownload: s?.allow_download ?? false,
    isActive: s?.is_active ?? true,
  }
}

function SlideForm({ slide, takenSlugs, nextOrder, modules, defaultModuleId, onOpenChange, onSaved }: Omit<Props, 'open'>) {
  const [f, setF] = useState(() => initialState(slide, modules.find((m) => m.id === defaultModuleId)))
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const selected = modules.find((m) => m.id === f.moduleId)
  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => setF((s) => ({ ...s, [key]: value }))

  const validate = (): Errors => {
    const e: Errors = {}
    if (!f.title.trim()) e.title = 'Title is required.'
    if (!SLUG_RE.test(f.slug)) e.slug = 'Use lowercase letters, numbers and dashes only.'
    else if (takenSlugs.includes(f.slug) && f.slug !== slide?.slug) e.slug = 'This slug is already used by another slide.'
    if (!f.filePath) e.file = 'Upload a file for this format.'
    if (f.outline.some((r) => r.title.trim() && !(Number.isInteger(Number(r.page)) && Number(r.page) >= 1))) e.outline = 'Each section needs a page number of 1 or more.'
    return e
  }

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) {
      // Move focus to the first invalid control after the error state renders.
      setTimeout(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    const draft: SlideDraft = {
      slug: f.slug,
      title: f.title.trim(),
      description: f.description.trim() || null,
      presenter: f.presenter.trim() || null,
      file_type: f.fileType,
      file_url: f.filePath,
      module_id: f.moduleId === NO_MODULE ? null : f.moduleId,
      order_index: slide?.order_index ?? nextOrder,
      allow_download: f.allowDownload,
      is_active: f.isActive,
      outline: f.outline.filter((r) => r.title.trim()).map((r) => ({ title: r.title.trim(), page: Number(r.page) })),
    }
    setSaving(true)
    try {
      const saved = slide ? await updateSlide(slide.id, draft) : await createSlide(draft)
      toast.success(slide ? 'Slide updated' : 'Slide created')
      onSaved(saved)
    } catch {
      toast.error('Could not save the slide. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const err = (id: string, msg?: string) => msg && <p id={`${id}-error`} role="alert" className="text-xs text-destructive">{msg}</p>

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <SheetHeader className="border-b px-5 py-4">
        <SheetTitle>{slide ? 'Edit slide' : 'Upload slide'}</SheetTitle>
        <SheetDescription>{slide ? `/slides/${slide.slug}` : 'Files are stored in R2 as slides/{slug}.html or .pdf.'}</SheetDescription>
      </SheetHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="slide-title" className="text-sm font-medium">Title</label>
            <Input
              {...fieldA11y('slide-title', errors.title)}
              value={f.title}
              onChange={(e) => setF((s) => ({ ...s, title: e.target.value, slug: s.slugTouched ? s.slug : slugify(e.target.value) }))}
              placeholder="React Fundamentals"
            />
            {err('slide-title', errors.title)}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="slide-slug" className="text-sm font-medium">Slug</label>
            <div className="flex items-center rounded-lg border focus-within:ring-3 focus-within:ring-ring/50">
              <span className="pl-2.5 font-mono text-xs text-muted-foreground" aria-hidden>/slides/</span>
              <Input
                {...fieldA11y('slide-slug', errors.slug)}
                value={f.slug}
                onChange={(e) => setF((s) => ({ ...s, slug: e.target.value.toLowerCase().replace(/\s+/g, '-'), slugTouched: true }))}
                className="border-0 pl-0.5 font-mono shadow-none focus-visible:ring-0"
                spellCheck={false}
                autoCapitalize="off"
              />
            </div>
            {err('slide-slug', errors.slug)}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="slide-description" className="text-sm font-medium">Description</label>
            <Textarea id="slide-description" rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="slide-presenter" className="text-sm font-medium">Presenter</label>
            <Input id="slide-presenter" value={f.presenter} onChange={(e) => set('presenter', e.target.value)} autoComplete="name" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="slide-content-module" className="text-sm font-medium">Content module</label>
            <Select
              value={f.moduleId}
              onValueChange={(v) => set('moduleId', v)}
            >
              <SelectTrigger id="slide-content-module" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_MODULE}>No module</SelectItem>
                {modules.map((m) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {selected ? `${MODULE_LABELS[selected.category]} · order is managed in Modules.` : 'Group decks of one course, client or workshop. Order is managed in Modules.'}
            </p>
          </div>
        </section>

        <SlideFileField
          fileType={f.fileType}
          onFileTypeChange={(t) => setF((s) => ({ ...s, fileType: t, filePath: '', fileName: '' }))}
          slug={f.slug}
          fileName={f.fileName}
          onUploaded={(path, name) => setF((s) => ({ ...s, filePath: path, fileName: name }))}
          onClear={() => setF((s) => ({ ...s, filePath: '', fileName: '' }))}
          fileError={errors.file}
          onBusyChange={setUploading}
        />

        <OutlineEditor rows={f.outline} onChange={(rows) => set('outline', rows)} error={errors.outline} />

        <section className="flex flex-col gap-3" aria-labelledby="slide-access-heading">
          <h3 id="slide-access-heading" className="text-sm font-medium">Access</h3>
          <div className="flex items-start gap-2.5 rounded-lg border px-3 py-2.5">
            <span className="mt-0.5 text-muted-foreground">{selected?.access_code ? <Lock className="size-4" aria-hidden /> : <Globe className="size-4" aria-hidden />}</span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{selected?.access_code ? 'Locked by module' : 'Public'}</span>
              <span className="block text-xs text-muted-foreground">
                {selected?.access_code ? `Viewers enter the access code of “${selected.title}”.` : 'Anyone with the link can view. Set an access code on the module to lock it.'}
              </span>
            </span>
          </div>
          <ToggleRow id="slide-download" label="Allow download" hint="Show a download button to viewers." checked={f.allowDownload} onChange={(v) => set('allowDownload', v)} />
          <ToggleRow id="slide-active" label="Active" hint="Inactive slides return “not found” on the public link." checked={f.isActive} onChange={(v) => set('isActive', v)} />
        </section>
      </div>

      <SheetFooter className="flex-row justify-end gap-2 border-t px-5 py-3">
        <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button type="submit" size="lg" disabled={saving || uploading}>
          {saving && <Loader2 className="animate-spin" aria-hidden />}
          {slide ? 'Save changes' : 'Create slide'}
        </Button>
      </SheetFooter>
    </form>
  )
}

function ToggleRow({ id, label, hint, icon, checked, onChange }: { id: string; label: string; hint: string; icon?: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
      <label htmlFor={id} className="flex min-w-0 items-start gap-2.5">
        {icon && <span className="mt-0.5 text-muted-foreground">{icon}</span>}
        <span className="min-w-0">
          <span className="block text-sm font-medium">{label}</span>
          <span className="block text-xs text-muted-foreground">{hint}</span>
        </span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
