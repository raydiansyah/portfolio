import { Loader2 } from 'lucide-react'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { STORAGE_BUCKETS, type Profile, type SocialLinks } from '@/types/supabase'
import { getProfile, updateProfile, uploadPublicFile } from '../../data/repo'
import { Dropzone } from '../../ui/Dropzone'
import { PageHeader } from '../../ui/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { useResource } from '../../ui/useResource'

const BIO_MAX = 600
const SOCIALS: { key: keyof SocialLinks; label: string; placeholder: string }[] = [
  { key: 'github', label: 'GitHub', placeholder: 'https://github.com/username' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/username' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/username' },
  { key: 'x', label: 'X', placeholder: 'https://x.com/username' },
  { key: 'website', label: 'Website', placeholder: 'https://example.com' },
]

type Form = Pick<Profile, 'full_name' | 'headline' | 'bio' | 'avatar_url' | 'email' | 'phone' | 'location' | 'social_links'>

const toForm = (p: Profile): Form => ({
  full_name: p.full_name, headline: p.headline, bio: p.bio, avatar_url: p.avatar_url,
  email: p.email, phone: p.phone, location: p.location, social_links: { ...p.social_links },
})

const isUrl = (v: string) => {
  try {
    return ['http:', 'https:'].includes(new URL(v).protocol)
  } catch {
    return false
  }
}

function validate(f: Form) {
  const errors: Record<string, string> = {}
  if (!f.full_name.trim()) errors.full_name = 'Full name is required.'
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) errors.email = 'Enter a valid email address.'
  if (f.phone && !/^[+\d][\d\s-]{6,}$/.test(f.phone)) errors.phone = 'Use digits, spaces, dashes and an optional leading +.'
  if ((f.bio ?? '').length > BIO_MAX) errors.bio = `Bio must be ${BIO_MAX} characters or fewer.`
  for (const s of SOCIALS) {
    const v = f.social_links[s.key]
    if (v && !isUrl(v)) errors[s.key] = 'Enter a full URL starting with https://'
  }
  return errors
}

function Field({ id, label, error, children, hint }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p id={`${id}-err`} className="text-xs text-destructive">{error}</p> : hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function ProfileForm({ profile }: { profile: Profile }) {
  const uid = useId()
  const [saved, setSaved] = useState(() => toForm(profile))
  const [form, setForm] = useState(saved)
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const errors = validate(form)
  const shown = touched ? errors : {}
  const pristine = JSON.stringify(form) === JSON.stringify(saved)
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))
  const setSocial = (k: keyof SocialLinks, v: string) => setForm((f) => ({ ...f, social_links: { ...f.social_links, [k]: v || undefined } }))
  const nullable = (v: string) => (v.trim() ? v : null)
  const aria = (k: string) => ({ 'aria-invalid': !!shown[k] || undefined, 'aria-describedby': shown[k] ? `${uid}-${k}-err` : undefined })

  const onAvatar = async (file: File) => {
    setUploading(true)
    try {
      set('avatar_url', await uploadPublicFile(STORAGE_BUCKETS.avatars, profile.id, file))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (Object.keys(errors).length) return toast.error('Please fix the highlighted fields.')
    setSaving(true)
    try {
      const row = await updateProfile(profile.id, { ...form, full_name: form.full_name.trim() })
      const next = toForm(row)
      setSaved(next)
      setForm(next)
      setTouched(false)
      toast.success('Profile saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save profile')
    } finally {
      setSaving(false)
    }
  }

  const id = (k: string) => `${uid}-${k}`
  const bioLen = (form.bio ?? '').length

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div className="flex flex-col gap-2">
        <h2 className="hud-label text-muted-foreground">Identity</h2>
        <p className="text-sm text-muted-foreground">Shown on the public site and in slide portals.</p>
      </div>
      <div className="flex flex-col gap-5">
        <Dropzone
          label="Avatar"
          accept="image/*"
          maxMb={2}
          aspect="square"
          hint={uploading ? 'Uploading…' : 'Square image, max 2 MB'}
          preview={form.avatar_url}
          onFile={(f) => void onAvatar(f)}
          onClear={() => set('avatar_url', null)}
        />
        <Field id={id('full_name')} label="Full name *" error={shown.full_name}>
          <Input id={id('full_name')} required value={form.full_name} onChange={(e) => set('full_name', e.target.value)} {...aria('full_name')} />
        </Field>
        <Field id={id('headline')} label="Headline">
          <Input id={id('headline')} value={form.headline ?? ''} onChange={(e) => set('headline', nullable(e.target.value))} />
        </Field>
        <Field id={id('bio')} label="Bio" error={shown.bio}>
          <Textarea id={id('bio')} rows={5} value={form.bio ?? ''} onChange={(e) => set('bio', nullable(e.target.value))} {...aria('bio')} />
          <p className={`text-right text-xs tabular-nums ${bioLen > BIO_MAX ? 'text-destructive' : 'text-muted-foreground'}`} aria-live="polite">
            {bioLen} / {BIO_MAX}
          </p>
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="hud-label text-muted-foreground">Contact</h2>
        <p className="text-sm text-muted-foreground">Used for the contact section and invoices.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={id('email')} label="Email" error={shown.email}>
          <Input id={id('email')} type="email" autoComplete="email" value={form.email ?? ''} onChange={(e) => set('email', nullable(e.target.value))} {...aria('email')} />
        </Field>
        <Field id={id('phone')} label="Phone" error={shown.phone}>
          <Input id={id('phone')} type="tel" autoComplete="tel" value={form.phone ?? ''} onChange={(e) => set('phone', nullable(e.target.value))} {...aria('phone')} />
        </Field>
        <div className="sm:col-span-2">
          <Field id={id('location')} label="Location">
            <Input id={id('location')} value={form.location ?? ''} onChange={(e) => set('location', nullable(e.target.value))} />
          </Field>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="hud-label text-muted-foreground">Social links</h2>
        <p className="text-sm text-muted-foreground">Full URLs, leave empty to hide.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {SOCIALS.map((s) => (
          <Field key={s.key} id={id(s.key)} label={s.label} error={shown[s.key]}>
            <Input
              id={id(s.key)}
              type="url"
              inputMode="url"
              placeholder={s.placeholder}
              value={form.social_links[s.key] ?? ''}
              onChange={(e) => setSocial(s.key, e.target.value.trim())}
              {...aria(s.key)}
            />
          </Field>
        ))}
      </div>

      <div className="flex justify-end gap-2 border-t pt-6 lg:col-span-2">
        <Button type="button" variant="ghost" disabled={pristine || saving} onClick={() => { setForm(saved); setTouched(false) }}>
          Discard
        </Button>
        <Button type="submit" disabled={pristine || saving || uploading}>
          {saving && <Loader2 className="motion-safe:animate-spin" aria-hidden />}
          {saving ? 'Saving…' : 'Save profile'}
        </Button>
      </div>
    </form>
  )
}

export default function ProfileModule() {
  const { data, error, reload } = useResource(getProfile)
  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="System" title="Profile" description="Your public identity, contact details and social links." />
      {error ? (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-destructive/40 p-4 text-sm">
          <span>Could not load profile: {error.message}</span>
          <Button variant="outline" size="sm" onClick={reload}>Retry</Button>
        </div>
      ) : data ? (
        <ProfileForm key={data.id} profile={data} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]" aria-busy="true" aria-label="Loading profile">
          <Skeleton className="h-4 w-24" />
          <div className="flex flex-col gap-5">
            <Skeleton className="h-[118px] rounded-lg" />
            {[0, 1].map((i) => <Skeleton key={i} className="h-[58px]" />)}
            <Skeleton className="h-[150px]" />
          </div>
        </div>
      )}
    </div>
  )
}
