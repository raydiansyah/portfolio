/** Turnstile is on unless explicitly disabled, and only when a site key is configured. */
export function turnstileEnabled() {
  const v = String(import.meta.env.VITE_TURNSTILE_ENABLED ?? 'on').trim().toLowerCase()
  return !['off', 'false', '0', 'no'].includes(v) && Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY)
}
