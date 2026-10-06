import { Eye, EyeOff, Loader2, Lock } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isConfigured, signIn, type SignInResult } from './auth'
import { Turnstile } from '@/components/Turnstile'
import { turnstileEnabled } from '@/lib/captcha'

const ERRORS: Record<Exclude<SignInResult, { ok: true }>['reason'], string> = {
  credentials: 'Email or password is incorrect.',
  'not-admin': 'This account does not have admin access.',
  captcha: 'Verification failed. Please complete the check again.',
  'rate-limit': 'Too many attempts. Wait a minute and try again.',
  network: 'Could not reach the server. Check your connection.',
}

/** Successful sign-in flips the session in useAdminSession, which swaps this page for the dashboard. */
export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [captcha, setCaptcha] = useState('')
  const [captchaReset, setCaptchaReset] = useState(0)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const needsCaptcha = turnstileEnabled()
  const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (pending) return
    if (needsCaptcha && !captcha) {
      setError('Please complete the verification first.')
      return
    }
    setPending(true)
    setError(null)
    const result = await signIn(email, password, needsCaptcha ? captcha : undefined)
    setPending(false)
    if (result.ok) return
    setError(ERRORS[result.reason])
    // Turnstile tokens are single-use: request a new one after every attempt.
    setCaptcha('')
    setCaptchaReset((n) => n + 1)
    if (result.reason === 'credentials') setPassword('')
  }

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-16">
      <div className="w-full max-w-sm">
        <p className="hud-label text-muted-foreground">Ray Diansyah — Restricted</p>
        <h1 className="mt-4 text-4xl font-semibold uppercase tracking-tight">Admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to manage the portfolio.</p>

        {!isConfigured() ? (
          <p role="alert" className="mt-10 rounded-md border border-destructive/40 p-4 text-sm text-destructive">
            Authentication is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-10 flex flex-col gap-5" noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="hud-label text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="hud-label text-muted-foreground">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 rounded-r-md"
                >
                  {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                </button>
              </div>
            </div>

            {needsCaptcha && (
              <Turnstile
                action="admin-login"
                theme={theme}
                resetKey={captchaReset}
                onToken={setCaptcha}
                onError={(code) =>
                  setError(
                    code === '110200'
                      ? `Verification is not enabled for ${location.hostname}. Add it to the Turnstile widget's allowed hostnames.`
                      : 'Verification could not load. Refresh the page and try again.',
                  )
                }
              />
            )}

            <p role="alert" aria-live="polite" className="min-h-5 text-sm text-destructive">
              {error}
            </p>

            <Button
              type="submit"
              size="lg"
              disabled={pending || !email || !password || (needsCaptcha && !captcha)}
              className="h-11 uppercase tracking-[0.18em] font-mono text-xs"
            >
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Lock className="size-4" aria-hidden />}
              {pending ? 'Signing in' : 'Sign in'}
            </Button>
          </form>
        )}

        <a href="/" className="hud-label mt-12 inline-block text-muted-foreground hover:text-foreground">
          ← Back to the harbor
        </a>
      </div>
    </main>
  )
}
