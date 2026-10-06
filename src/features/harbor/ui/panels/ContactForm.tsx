import { CheckCircle2, Loader2, Send } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Turnstile } from '@/components/Turnstile'
import { turnstileEnabled } from '@/lib/captcha'
import { useTheme } from '@/lib/theme'

/**
 * Contact form → `contact-submit` Edge Function (Turnstile verified server-side,
 * rate limited per IP, saved to `inboxes`). Plain fetch keeps supabase-js out of
 * the harbor's main bundle.
 */

type Field = 'name' | 'email' | 'subject' | 'message'
type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const SERVER_ERRORS: Record<string, string> = {
  captcha: 'Verification failed. Please complete the check again.',
  'rate-limited': 'Too many messages from your network. Please try again later, or email me directly.',
  invalid: 'Please check the fields and try again.',
}

function validate(v: Record<Field, string>) {
  const e: Partial<Record<Field, string>> = {}
  if (!v.name.trim()) e.name = 'Your name is required.'
  if (!EMAIL_RE.test(v.email.trim())) e.email = 'Enter a valid email address.'
  if (!v.subject.trim()) e.subject = 'Add a short subject.'
  if (v.message.trim().length < 10) e.message = 'Tell me a little more (at least 10 characters).'
  return e
}

async function submit(payload: Record<string, string>) {
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contact-submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''}`,
    },
    body: JSON.stringify(payload),
  })
  if (res.ok) return null
  const body = (await res.json().catch(() => ({}))) as { error?: string }
  return SERVER_ERRORS[body.error ?? ''] ?? 'Could not send right now. Please email me directly.'
}

export function ContactForm() {
  const uid = useId()
  const { theme } = useTheme()
  const needsCaptcha = turnstileEnabled()
  const [values, setValues] = useState<Record<Field, string>>({ name: '', email: '', subject: '', message: '' })
  const [website, setWebsite] = useState('') // honeypot
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [token, setToken] = useState('')
  const [captchaReset, setCaptchaReset] = useState(0)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const set = (k: Field, v: string) => setValues((s) => ({ ...s, [k]: v }))
  const id = (k: string) => `${uid}-${k}`
  const a11y = (k: Field) => ({
    id: id(k),
    'aria-invalid': errors[k] ? true : undefined,
    'aria-describedby': errors[k] ? id(`${k}-error`) : undefined,
  })

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const errs = validate(values)
    setErrors(errs)
    if (Object.keys(errs).length) {
      // Focus after React has rendered the error state.
      const form = e.currentTarget
      setTimeout(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    if (needsCaptcha && !token) {
      setStatus({ kind: 'error', message: 'Please complete the verification first.' })
      return
    }
    setStatus({ kind: 'sending' })
    const error = await submit({ ...values, token, website }).catch(() => 'Network error. Please try again.')
    if (!error) {
      setStatus({ kind: 'sent' })
      return
    }
    setStatus({ kind: 'error', message: error })
    // Turnstile tokens are single-use.
    setToken('')
    setCaptchaReset((n) => n + 1)
  }

  if (status.kind === 'sent') {
    return (
      <div role="status" className="flex flex-col items-start gap-3 rounded-lg border p-6">
        <CheckCircle2 className="size-6 text-lantern" aria-hidden />
        <p className="text-lg font-semibold">Message sent — thank you.</p>
        <p className="text-sm text-muted-foreground">I'll reply to {values.email}.</p>
        <Button variant="outline" onClick={() => {
          setValues({ name: '', email: '', subject: '', message: '' })
          setToken('')
          setStatus({ kind: 'idle' })
        }}>
          Send another
        </Button>
      </div>
    )
  }

  const err = (k: Field) => errors[k] && <p id={id(`${k}-error`)} className="text-xs text-destructive">{errors[k]}</p>
  const sending = status.kind === 'sending'

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5" aria-label="Contact form">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id('name')} className="hud-label text-muted-foreground">Name</label>
          <Input {...a11y('name')} autoComplete="name" value={values.name} onChange={(e) => set('name', e.target.value)} className="h-11" />
          {err('name')}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id('email')} className="hud-label text-muted-foreground">Email</label>
          <Input {...a11y('email')} type="email" inputMode="email" autoComplete="email" value={values.email} onChange={(e) => set('email', e.target.value)} className="h-11" />
          {err('email')}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id('subject')} className="hud-label text-muted-foreground">Subject</label>
        <Input {...a11y('subject')} maxLength={200} value={values.subject} onChange={(e) => set('subject', e.target.value)} className="h-11" />
        {err('subject')}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id('message')} className="hud-label text-muted-foreground">Message</label>
        <Textarea {...a11y('message')} rows={5} maxLength={5000} value={values.message} onChange={(e) => set('message', e.target.value)} />
        {err('message')}
      </div>

      {/* Honeypot: hidden from people and assistive tech, tempting for bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
        <label htmlFor={id('website')}>Website</label>
        <input id={id('website')} tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      {needsCaptcha && (
        <Turnstile
          action="contact"
          theme={theme}
          resetKey={captchaReset}
          onToken={setToken}
          onError={(code) =>
            setStatus({
              kind: 'error',
              message: code === '110200' ? `Verification isn't enabled for ${location.hostname} yet. Please email me directly.` : 'Verification could not load. Refresh and try again.',
            })
          }
        />
      )}

      <p role="alert" aria-live="polite" className="min-h-5 text-sm text-destructive">
        {status.kind === 'error' && status.message}
      </p>

      <Button type="submit" size="lg" disabled={sending || (needsCaptcha && !token)} className="h-11 self-start">
        {sending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
        {sending ? 'Sending' : 'Send message'}
      </Button>
    </form>
  )
}
