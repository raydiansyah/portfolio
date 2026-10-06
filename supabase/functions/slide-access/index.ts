/**
 * slide-access — check a slide's module access code and return the slide.
 *
 * POST { slug: string, code?: string | null }
 *   200 { slide }   (slide.file_url = R2 object key; the client prefixes the public base URL)
 * POST { module: string, code?: string | null }
 *   200 { module, slides }   (one code unlocks every visible slide of the module)
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

const STATUS: Record<string, [string, number]> = {
  'not-found': ['not-found', 404],
  'rate-limited': ['rate-limited', 429],
  expired: ['expired', 410],
  'wrong-code': ['wrong-code', 403],
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method-not-allowed' }, 405)

  let slug: unknown
  let mod: unknown
  let code: unknown
  try {
    ;({ slug, module: mod, code } = await req.json())
  } catch {
    return json({ error: 'bad-request' }, 400)
  }
  const SLUG_RE = /^[a-z0-9-]{1,160}$/
  const byModule = mod !== undefined
  if (byModule ? typeof mod !== 'string' || !SLUG_RE.test(mod) : typeof slug !== 'string' || !SLUG_RE.test(slug)) {
    return json({ error: 'bad-request' }, 400)
  }
  if (code != null && (typeof code !== 'string' || code.length > 64)) return json({ error: 'bad-request' }, 400)

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()

  if (byModule) {
    const res = await sb.rpc('verify_module_access_as_service', { p_module: mod, p_code: (code as string | null) ?? null, p_ip: ip })
    if (res.error) {
      console.error('module verify failed', res.error.message)
      return json({ error: 'server-error' }, 500)
    }
    const out = res.data as { status: string; module?: unknown; slides?: unknown }
    const fail = STATUS[out.status]
    if (fail) return json({ error: fail[0] }, fail[1])
    return json({ module: out.module, slides: out.slides })
  }
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

  const fail = STATUS[(data as { status: string }).status]
  if (fail) return json({ error: fail[0] }, fail[1])

  return json({ slide: (data as { slide: unknown }).slide })
})
