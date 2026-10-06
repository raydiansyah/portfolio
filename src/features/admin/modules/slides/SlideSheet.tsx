import { Globe, Loader2, Lock } from 'lucide-react'
import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { Slide, SlideFileType, SlideModule } from '@/types/supabase'
import { createSlide, updateSlide, type SlideDraft } from '../../data/slides'
import { AccessCodeField, type CodeMode } from './AccessCodeField'
import { OutlineEditor, type OutlineRow } from './OutlineEditor'
import { SlideFileField, type PptSource } from './SlideFileField'
import { CUSTOM_CODE_RE, MODULES, MODULE_LABELS, PIN_RE, SLUG_RE, fieldA11y, isHttpsUrl, slugify } from './shared'

interface Props {
  open: boolean
  /** null = create a new slide. */
  slide: Slide | null
  takenSlugs: string[]
  nextOrder: number
  onOpenChange: (open: boolean) => void
  /** `plainCode` is set only when a new code was saved, so the caller can show it once. */
  onSaved: (slide: Slide, plainCode: string | null) => void
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

type Errors = Partial<Record<'title' | 'slug' | 'file' | 'embed' | 'code' | 'outline', string>>

function initialState(s: Slide | null) {
  const embedded = s?.file_type === 'ppt' && isHttpsUrl(s.file_url)
  return {
    title: s?.title ?? '',
    slug: s?.slug ?? '',
    slugTouched: Boolean(s),
    description: s?.description ?? '',
    presenter: s?.presenter ?? '',
    module: s?.module_category ?? ('materi_kuliah' as SlideModule),
    fileType: s?.file_type ?? ('pdf' as SlideFileType),
    filePath: s && !embedded ? s.file_url : '',
    fileName: s && !embedded ? (s.file_url.split('/').pop() ?? s.file_url) : '',
    pptSource: (embedded ? 'embed' : 'upload') as PptSource,
    embedUrl: embedded ? s.file_url : '',
    outline: (s?.outline ?? []).map((o): OutlineRow => ({ key: crypto.randomUUID(), title: o.title, page: String(o.page) })),
    isProtected: s?.is_protected ?? false,
    codeMode: 'pin' as CodeMode,
    code: '',
    allowDownload: s?.allow_download ?? false,
    isActive: s?.is_active ?? true,
  }
}

function SlideForm({ slide, takenSlugs, nextOrder, onOpenChange, onSaved }: Omit<Props, 'open'>) {
  const [f, setF] = useState(() => initialState(slide))
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => setF((s) => ({ ...s, [key]: value }))
  const hadCode = Boolean(slide?.is_protected)

  const validate = (): Errors => {
    const e: Errors = {}
    if (!f.title.trim()) e.title = 'Title is required.'
    if (!SLUG_RE.test(f.slug)) e.slug = 'Use lowercase letters, numbers and dashes only.'
    else if (takenSlugs.includes(f.slug) && f.slug !== slide?.slug) e.slug = 'This slug is already used by another slide.'
    if (f.fileType === 'ppt' && f.pptSource === 'embed') {
      if (!isHttpsUrl(f.embedUrl)) e.embed = 'Enter a valid https:// embed URL.'
    } else if (!f.filePath) e.file = 'Upload a file for this format.'
    if (f.isProtected) {
      if (!f.code && !hadCode) e.code = 'Set an access code or make the slide public.'
      else if (f.code && f.codeMode === 'pin' && !PIN_RE.test(f.code)) e.code = 'PIN must be exactly 6 digits.'
      else if (f.code && f.codeMode === 'custom' && !CUSTOM_CODE_RE.test(f.code)) e.code = 'At least 6 letters, digits or dashes.'
    }
    if (f.outline.some((r) => r.title.trim() && !(Number.isInteger(Number(r.page)) && Number(r.page) >= 1))) e.outline = 'Each section needs a page number of 1 or more.'
    return e
  }

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) {
      // Move focus to the first invalid control after the error state renders.
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    const embed = f.fileType === 'ppt' && f.pptSource === 'embed'
    const draft: SlideDraft = {
      slug: f.slug,
      title: f.title.trim(),
      description: f.description.trim() || null,
      presenter: f.presenter.trim() || null,
      file_type: f.fileType,
      file_url: embed ? f.embedUrl : f.filePath,
      module_category: f.module,
      order_index: slide?.order_index ?? nextOrder,
      allow_download: f.allowDownload,
      is_active: f.isActive,
      is_protected: f.isProtected,
      outline: f.outline.filter((r) => r.title.trim()).map((r) => ({ title: r.title.trim(), page: Number(r.page) })),
    }
    const newCode = f.isProtected && f.code ? f.code : null
    setSaving(true)
    try {
      const saved = slide
        ? await updateSlide(slide.id, draft, newCode ?? undefined) // undefined = keep the current hashed code
        : await createSlide(draft, newCode)
      toast.success(slide ? 'Slide updated' : 'Slide created')
      onSaved(saved, newCode)
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
        <SheetDescription>{slide ? `/slides/${slide.slug}` : 'Files are stored privately and served through short-lived signed links.'}</SheetDescription>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="slide-presenter" className="text-sm font-medium">Presenter</label>
              <Input id="slide-presenter" value={f.presenter} onChange={(e) => set('presenter', e.target.value)} autoComplete="name" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="slide-module" className="text-sm font-medium">Module</label>
              <Select value={f.module} onValueChange={(v) => set('module', v as SlideModule)}>
                <SelectTrigger id="slide-module" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODULES.map((m) => <SelectItem key={m} value={m}>{MODULE_LABELS[m]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <SlideFileField
          fileType={f.fileType}
          onFileTypeChange={(t) => setF((s) => ({ ...s, fileType: t, filePath: '', fileName: '' }))}
          slug={f.slug}
          fileName={f.fileName}
          onUploaded={(path, name) => setF((s) => ({ ...s, filePath: path, fileName: name }))}
          onClear={() => setF((s) => ({ ...s, filePath: '', fileName: '' }))}
          pptSource={f.pptSource}
          onPptSourceChange={(v) => set('pptSource', v)}
          embedUrl={f.embedUrl}
          onEmbedUrlChange={(v) => set('embedUrl', v)}
          fileError={errors.file}
          embedError={errors.embed}
          onBusyChange={setUploading}
        />

        <OutlineEditor rows={f.outline} onChange={(rows) => set('outline', rows)} error={errors.outline} />

        <section className="flex flex-col gap-3" aria-labelledby="slide-access-heading">
          <h3 id="slide-access-heading" className="text-sm font-medium">Access</h3>
          <ToggleRow
            id="slide-protected"
            label={f.isProtected ? 'Locked' : 'Public'}
            hint={f.isProtected ? 'Viewers must enter the access code.' : 'Anyone with the link can view.'}
            icon={f.isProtected ? <Lock className="size-4" aria-hidden /> : <Globe className="size-4" aria-hidden />}
            checked={f.isProtected}
            onChange={(v) => set('isProtected', v)}
          />
          {f.isProtected && (
            <AccessCodeField
              mode={f.codeMode}
              onModeChange={(m) => set('codeMode', m)}
              code={f.code}
              onCodeChange={(c) => set('code', c)}
              hasExistingCode={hadCode}
              error={errors.code}
            />
          )}
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
