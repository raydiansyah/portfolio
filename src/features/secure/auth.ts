import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

/**
 * Admin auth for /secure, backed by Supabase Auth.
 *
 * Authorisation comes from `app_metadata.role` ('admin' | 'owner'), which only
 * the service role can set — users cannot grant it to themselves. This client
 * check only gates the UI; data must still be protected by RLS
 * (`private.is_admin()` in the Supabase project).
 */

const ADMIN_ROLES = ['admin', 'owner']

let client: SupabaseClient | null = null

export function isConfigured() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
}

export function supabase(): SupabaseClient {
  if (client) return client
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY')
  client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
  return client
}

export function isAdmin(user: User | null | undefined) {
  const role = user?.app_metadata?.role
  return typeof role === 'string' && ADMIN_ROLES.includes(role)
}

export type SignInResult = { ok: true } | { ok: false; reason: 'credentials' | 'not-admin' | 'captcha' | 'rate-limit' | 'network' }

export async function signIn(email: string, password: string, captchaToken?: string): Promise<SignInResult> {
  try {
    const { data, error } = await supabase().auth.signInWithPassword({
      email: email.trim(),
      password,
      options: captchaToken ? { captchaToken } : undefined,
    })
    if (error) {
      const msg = error.message.toLowerCase()
      if (error.status === 429 || msg.includes('rate')) return { ok: false, reason: 'rate-limit' }
      if (msg.includes('captcha')) return { ok: false, reason: 'captcha' }
      return { ok: false, reason: 'credentials' }
    }
    // Valid account without the admin role: end the session immediately.
    if (!isAdmin(data.user)) {
      await supabase().auth.signOut()
      return { ok: false, reason: 'not-admin' }
    }
    return { ok: true }
  } catch {
    return { ok: false, reason: 'network' }
  }
}

export async function signOut() {
  await supabase().auth.signOut()
}

export type AdminSession = { status: 'loading' } | { status: 'signed-out' } | { status: 'admin'; session: Session }

/** Live admin session; non-admin sessions are treated as signed out. */
export function useAdminSession(): AdminSession {
  const [state, setState] = useState<AdminSession>(() => (isConfigured() ? { status: 'loading' } : { status: 'signed-out' }))

  useEffect(() => {
    if (!isConfigured()) return
    const resolve = (session: Session | null) =>
      setState(session && isAdmin(session.user) ? { status: 'admin', session } : { status: 'signed-out' })
    void supabase().auth.getSession().then(({ data }) => resolve(data.session))
    const { data } = supabase().auth.onAuthStateChange((_event, session) => resolve(session))
    return () => data.subscription.unsubscribe()
  }, [])

  return state
}
