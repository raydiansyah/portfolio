/**
 * slide-access — verify a slide's access code and return a short-lived signed URL.
 *
 * POST { slug: string, code?: string | null }
 *   200 { slide, signed_url, expires_in }
 *   403 { error: 'wrong-code' } · 404 { error: 'not-found' } · 429 { error: 'rate-limited' }
 *
 * The code check, rate limit (per hashed client IP) and access log happen in
 * private.check_slide_access() via the service-role-only RPC. Files in the
 * private `slides` bucket are served through createSignedUrl; https embed URLs
 * (Google Slides / Office) are returned as-is.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'

const EXPIRES_IN = 60 * 60 // 1 hour

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
  if (status === 'wrong-code') return json({ error: 'wrong-code' }, 403)

  const slide = (data as { slide: { file_url: string } }).slide
  let signedUrl = slide.file_url
  if (!/^https:\/\//.test(slide.file_url)) {
    const signed = await sb.storage.from('slides').createSignedUrl(slide.file_url, EXPIRES_IN)
    if (signed.error || !signed.data) {
      console.error('sign failed', signed.error?.message)
      return json({ error: 'file-unavailable' }, 502)
    }
    signedUrl = signed.data.signedUrl
  }
  return json({ slide, signed_url: signedUrl, expires_in: EXPIRES_IN })
})
