/**
 * contact-submit — public contact form for the harbor's Contact panel.
 *
 * POST { name, email, phone?, service?, budget?, message, token, website? }
 *   200 { ok: true } · 400 invalid · 403 captcha failed · 429 rate-limited · 500 server error
 *
 * Order of checks: honeypot → field validation → Cloudflare Turnstile (secret,
 * action "contact", allowed hostname) → per-IP rate limit + insert via the
 * service-role-only RPC (saved to `pesan_kontak`). A notification email is sent best-effort; the message
 * is already saved even if email delivery fails.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

async function verifyTurnstile(token: string, ip: string) {
  const enabled = !['off', 'false', '0', 'no'].includes((Deno.env.get('TURNSTILE_ENABLED') ?? 'on').trim().toLowerCase())
  if (!enabled) return true
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
  const hostnames = new Set((Deno.env.get('TURNSTILE_HOSTNAMES') ?? '').split(',').map((h) => h.trim()).filter(Boolean))
  if (!secret || !token || token.length > 2048 || hostnames.size === 0) return false
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    })
    if (!res.ok) return false
    const r = (await res.json()) as { success?: boolean; action?: string; hostname?: string }
    return r.success === true && r.action === 'contact' && typeof r.hostname === 'string' && hostnames.has(r.hostname)
  } catch {
    return false
  }
}

async function notify(name: string, email: string, subject: string, details: string, message: string) {
  const key = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('NOTIFICATION_EMAIL_FROM')
  const to = Deno.env.get('NOTIFICATION_EMAIL_TO')
  if (!key || !from || !to) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        from, to: [to], reply_to: email,
        subject: `[Harbor] ${subject}`,
        text: `${name} <${email}>\n${details}\n\n${message}`,
        html: `<p><strong>${escapeHtml(name)}</strong> &lt;${escapeHtml(email)}&gt;</p><p style="white-space:pre-wrap">${escapeHtml(details)}</p><div style="white-space:pre-wrap">${escapeHtml(message)}</div>`,
      }),
    })
  } catch (e) {
    console.error('notification failed', e)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method-not-allowed' }, 405)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid' }, 400)
  }
  // Honeypot: real visitors never fill the hidden "website" field. Pretend success.
  if (typeof body.website === 'string' && body.website.trim()) return json({ ok: true })

  const str = (k: string) => (typeof body[k] === 'string' ? (body[k] as string).trim() : '')
  const name = str('name')
  const email = str('email')
  const phone = str('phone')
  const service = str('service')
  const budget = str('budget')
  const message = str('message')
  const token = str('token')
  if (
    !name || name.length > 120 || !EMAIL_RE.test(email) || email.length > 254 ||
    phone.length > 40 || (phone && !/^[+()\d\s.-]{6,40}$/.test(phone)) ||
    service.length > 120 || budget.length > 80 || message.length < 10 || message.length > 5000
  ) {
    return json({ error: 'invalid' }, 400)
  }

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
  if (!(await verifyTurnstile(token, ip))) return json({ error: 'captcha' }, 403)

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data, error } = await sb.rpc('submit_contact_as_service', { p_name: name, p_email: email, p_phone: phone, p_service: service, p_budget: budget, p_body: message, p_ip: ip })
  if (error) {
    console.error('insert failed', error.message)
    return json({ error: 'server-error' }, 500)
  }
  if (data === 'rate-limited') return json({ error: 'rate-limited' }, 429)

  const details = [`Layanan: ${service || '—'}`, `Anggaran: ${budget || 'Belum ditentukan'}`, phone && `Telepon: ${phone}`].filter(Boolean).join('\n')
  await notify(name, email, service || 'Pesan baru', details, message)
  return json({ ok: true })
})
