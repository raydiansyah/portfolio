import type { Session, User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { isConfigured, supabase } from '@/lib/supabase'

/**
 * Admin auth for /secure, backed by Supabase Auth.
 *
 * Authorisation comes from `app_metadata.role` ('admin' | 'owner'), which only
 * the service role can set — users cannot grant it to themselves. This client
 * check only gates the UI; data is protected by RLS (`private.is_admin()`).
 */

const ADMIN_ROLES = ['admin', 'owner']

export { isConfigured, supabase }

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
