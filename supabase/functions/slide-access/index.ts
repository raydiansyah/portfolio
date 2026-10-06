/**
 * slide-access — check a slide's module access code and return the slide.
 *
 * POST { slug: string, code?: string | null }
 *   200 { slide }   (slide.file_url = R2 object key; the client prefixes the public base URL)
 *   403 { error: 'wrong-code' } · 404 { error: 'not-found' } · 410 { error: 'expired' } · 429 { error: 'rate-limited' }
 *
 * Slides live in `slide_presentasi`, grouped by `material` which holds the access
 * code and expiry. The check, rate limit (per hashed client IP) and access log run
 * in private.check_slide_access() via the service-role-only RPC.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method-not-allowed' }, 405)

  let slug: unknown
  let code: unknown
  try {
    ;({ slug, code } = await req.json())
  } catch {
    return json({ error: 'bad-request' }, 400)
  }
  if (typeof slug !== 'string' || !/^[a-z0-9-]{1,120}$/.test(slug)) return json({ error: 'bad-request' }, 400)
  if (code != null && (typeof code !== 'string' || code.length > 64)) return json({ error: 'bad-request' }, 400)

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
  const { data, error } = await sb.rpc('verify_slide_access_as_service', {
    p_slug: slug,
    p_code: (code as string | null) ?? null,
    p_ip: ip,
    p_user_agent: req.headers.get('user-agent') ?? '',
    p_referrer: req.headers.get('referer') ?? '',
  })
  if (error) {
    console.error('verify failed', error.message)
    return json({ error: 'server-error' }, 500)
  }

  const status = (data as { status: string }).status
  if (status === 'not-found') return json({ error: 'not-found' }, 404)
  if (status === 'rate-limited') return json({ error: 'rate-limited' }, 429)
  if (status === 'expired') return json({ error: 'expired' }, 410)
  if (status === 'wrong-code') return json({ error: 'wrong-code' }, 403)

  return json({ slide: (data as { slide: unknown }).slide })
})
