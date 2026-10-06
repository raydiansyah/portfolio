import { useRef, useState } from 'react'
import type { ClipboardEvent, FormEvent, KeyboardEvent } from 'react'
import { Anchor, KeyRound, Loader2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { verifySlideAccess } from '@/features/admin/data/slides'
import { cn } from '@/lib/utils'
import type { PublicSlideMeta, SlideAccessGrant } from '@/types/supabase'
import { ThemeToggle } from './ThemeToggle'
import { MODULE_LABEL } from './types'

const LEN = 6
const empty = () => Array<string>(LEN).fill('')
const SHAKE_CSS = '@keyframes slides-shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}'

interface Props {
  meta: PublicSlideMeta
  onGranted: (grant: SlideAccessGrant) => void
}

export function AccessGate({ meta, onGranted }: Props) {
  const [mode, setMode] = useState<'digits' | 'text'>('digits')
  const [digits, setDigits] = useState(empty)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [shakeKey, setShakeKey] = useState(0)
  const boxes = useRef<(HTMLInputElement | null)[]>([])
  const textRef = useRef<HTMLInputElement>(null)

  const focusBox = (i: number) => boxes.current[Math.max(0, Math.min(LEN - 1, i))]?.focus()

  async function submit(code: string) {
    if (busy || !code) return
    setBusy(true)
    setError('')
    const res = await verifySlideAccess(meta.slug, code)
    setBusy(false)
    if (res.ok) return onGranted(res.grant)
    if (res.reason === 'rate-limit') {
      setError('Too many attempts. Wait a minute, then try again.')
      return
    }
    if (res.reason === 'not-found') {
      setError('This deck is no longer available.')
      return
    }
    setError('Incorrect code. Check it with your presenter and try again.')
    setShakeKey((k) => k + 1)
    if (mode === 'digits') {
      setDigits(empty())
      requestAnimationFrame(() => focusBox(0))
    } else {
      requestAnimationFrame(() => textRef.current?.select())
    }
  }

  /** Writes `chars` starting at box `from`; auto-submits once all boxes are filled. */
  function fill(from: number, chars: string) {
    const next = [...digits]
    let i = from
    for (const c of chars.slice(0, LEN - from)) next[i++] = c
    setDigits(next)
    setError('')
    focusBox(i)
    if (next.every(Boolean)) void submit(next.join(''))
  }

  function onBoxChange(i: number, raw: string) {
    const v = raw.replace(/\D/g, '')
    if (!v) {
      const next = [...digits]
      next[i] = ''
      setDigits(next)
      return
    }
    // Autofill (one-time-code) or fast typing can deliver several digits at once.
    // A full code fills every box; otherwise keep only the newest keystroke.
    if (v.length >= LEN) fill(0, v)
    else fill(i, v.slice(-1))
  }

  function onBoxKey(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      e.preventDefault()
      const next = [...digits]
      next[i - 1] = ''
      setDigits(next)
      focusBox(i - 1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      focusBox(i - 1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      focusBox(i + 1)
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      focusBox(e.key === 'Home' ? 0 : LEN - 1)
    }
  }

  function onPaste(i: number, e: ClipboardEvent<HTMLInputElement>) {
    const v = e.clipboardData.getData('text').replace(/\D/g, '')
    if (!v) return
    e.preventDefault()
    fill(v.length >= LEN ? 0 : i, v)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const code = mode === 'digits' ? digits.join('') : text.trim()
    if (mode === 'digits' && code.length < LEN) {
      setError(`Enter all ${LEN} digits.`)
      focusBox(digits.findIndex((d) => !d))
      return
    }
    if (!code) {
      setError('Enter your access code.')
      textRef.current?.focus()
      return
    }
    void submit(code)
  }

  function switchMode() {
    const next = mode === 'digits' ? 'text' : 'digits'
    setMode(next)
    setError('')
    requestAnimationFrame(() => (next === 'text' ? textRef.current?.focus() : focusBox(0)))
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-background text-foreground">
      <style>{SHAKE_CSS}</style>
      <header className="flex h-14 items-center justify-between px-4 sm:px-6">
        <a href="/" className="inline-flex items-center gap-2 rounded-md text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Anchor className="size-4 text-primary" aria-hidden />
          Ray Diansyah
        </a>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-14">
        <section aria-labelledby="gate-title" className="w-full max-w-md rounded-2xl border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
              <Lock className="size-5" aria-hidden />
            </span>
            <p className="hud-label text-muted-foreground">{MODULE_LABEL[meta.module_category]}</p>
            <h1 id="gate-title" className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">
              {meta.title}
            </h1>
            {meta.presenter && <p className="text-sm text-muted-foreground">Presented by {meta.presenter}</p>}
          </div>

          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <p id="gate-instruction" className="text-center text-sm">
              {mode === 'digits' ? `Enter the ${LEN}-digit code from your presenter.` : 'Enter the access code from your presenter.'}
            </p>

            <div key={shakeKey} className={cn(shakeKey > 0 && 'motion-safe:animate-[slides-shake_0.4s_ease-in-out]')}>
              {mode === 'digits' ? (
                <div role="group" aria-labelledby="gate-instruction" className="flex justify-center gap-1.5 sm:gap-2">
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        boxes.current[i] = el
                      }}
                      value={d}
                      onChange={(e) => onBoxChange(i, e.target.value)}
                      onKeyDown={(e) => onBoxKey(i, e)}
                      onPaste={(e) => onPaste(i, e)}
                      onFocus={(e) => e.target.select()}
                      inputMode="numeric"
                      autoComplete={i === 0 ? 'one-time-code' : 'off'}
                      pattern="[0-9]*"
                      maxLength={i === 0 ? LEN : 1}
                      autoFocus={i === 0}
                      disabled={busy}
                      aria-label={`Digit ${i + 1} of ${LEN}`}
                      aria-invalid={!!error || undefined}
                      className="aspect-[4/5] w-11 rounded-lg border border-input bg-background text-center font-mono text-xl tabular-nums outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60 aria-invalid:border-destructive sm:w-12 sm:text-2xl dark:bg-input/30"
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="gate-text-code" className="sr-only">
                    Access code
                  </label>
                  <Input
                    id="gate-text-code"
                    ref={textRef}
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value)
                      setError('')
                    }}
                    placeholder="e.g. KLIEN-2026"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    disabled={busy}
                    aria-invalid={!!error || undefined}
                    aria-describedby="gate-error"
                    className="h-12 text-center font-mono text-lg tracking-widest uppercase"
                  />
                </div>
              )}
            </div>

            <p id="gate-error" role="status" aria-live="polite" className="min-h-5 text-center text-sm text-destructive">
              {error}
            </p>

            <Button type="submit" size="lg" className="h-11 w-full" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden /> Checking…
                </>
              ) : (
                'Open slides'
              )}
            </Button>

            <Button type="button" variant="link" size="sm" onClick={switchMode} className="mx-auto">
              <KeyRound aria-hidden />
              {mode === 'digits' ? 'Use a text code' : `Use a ${LEN}-digit code`}
            </Button>
          </form>
        </section>
      </main>
    </div>
  )
}
