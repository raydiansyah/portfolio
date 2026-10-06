import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.gen'

/**
 * Browser Supabase client (publishable key only — RLS decides what it can do).
 * `Database` is generated from the live schema:
 *   supabase gen types typescript --linked --schema public > src/types/database.gen.ts
 * Domain types in src/types/supabase.ts narrow enums/JSON; repositories cast at the boundary.
 */

let client: SupabaseClient<Database> | null = null

export function isConfigured() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
}

export function supabase(): SupabaseClient<Database> {
  if (client) return client
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY')
  client = createClient<Database>(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
  return client
}

/** Throw on PostgREST/Storage errors; return data narrowed to the domain type. */
export function unwrap<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

/** Drop server-managed columns (id, timestamps, counters) before an update. */
export function omit<T extends object, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
  const copy = { ...obj }
  for (const k of keys) delete copy[k]
  return copy
}
