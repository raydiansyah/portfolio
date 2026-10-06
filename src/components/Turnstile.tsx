import { useEffect, useLayoutEffect, useRef } from 'react'

/**
 * Cloudflare Turnstile widget (shared by admin login and the public contact form).
 * Tokens are verified server-side: by Supabase Auth for sign-in (`admin-login`)
 * and by the `contact-submit` Edge Function for messages (`contact`).
 */

interface TurnstileApi {
  render(el: HTMLElement, opts: Record<string, unknown>): string
  reset(id: string): void
  remove(id: string): void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let scriptPromise: Promise<void> | null = null

function loadScript() {
  if (window.turnstile) return Promise.resolve()
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT_SRC
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      scriptPromise = null
      reject(new Error('turnstile-load-failed'))
    }
    document.head.appendChild(s)
  })
  return scriptPromise
}

interface Props {
  /** Turnstile action name; the server checks it matches. */
  action: string
  onToken: (token: string) => void
  /** Turnstile error code, e.g. '110200' = hostname not allowed for this site key. */
  onError: (code?: string) => void
  /** Increment to force a fresh challenge (tokens are single-use). */
  resetKey: number
  theme: 'light' | 'dark'
}

export function Turnstile({ action, onToken, onError, resetKey, theme }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const widget = useRef<string | null>(null)
  // Latest callbacks without re-rendering the widget when parents pass new functions.
  const cb = useRef({ onToken, onError })
  useLayoutEffect(() => {
    cb.current = { onToken, onError }
  })

  useEffect(() => {
    let cancelled = false
    loadScript()
      .then(() => {
        if (cancelled || !host.current || !window.turnstile) return
        widget.current = window.turnstile.render(host.current, {
          sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
          action,
          theme,
          callback: (t: string) => cb.current.onToken(t),
          'expired-callback': () => cb.current.onToken(''),
          'error-callback': (code?: string) => {
            cb.current.onError(code)
            return true // handled: stops Turnstile's own console retry noise
          },
        })
      })
      .catch(() => cb.current.onError())
    return () => {
      cancelled = true
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current)
      widget.current = null
    }
  }, [theme, action])

  useEffect(() => {
    if (resetKey > 0 && widget.current && window.turnstile) window.turnstile.reset(widget.current)
  }, [resetKey])

  return <div ref={host} className="min-h-[65px]" />
}
