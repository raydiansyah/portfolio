/**
 * inbox-reply — send an admin's reply to a contact message via Resend.
 *
 * POST { inbox_id: uuid, message: string }   (Authorization: Bearer <admin session JWT>)
 *   200 { inbox }  · 401 unauthenticated · 403 not admin · 404 unknown message · 502 email failed
 *
 * Only callers whose JWT carries app_metadata.role in ('admin','owner') may send.
 * Uses project secrets RESEND_API_KEY and NOTIFICATION_EMAIL_FROM; mail keys never reach the browser.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method-not-allowed' }, 405)

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: auth } = await admin.auth.getUser(token)
  if (!auth.user) return json({ error: 'unauthenticated' }, 401)
  const role = auth.user.app_metadata?.role
  if (role !== 'admin' && role !== 'owner') return json({ error: 'forbidden' }, 403)

  let inboxId: unknown
  let message: unknown
  try {
    ;({ inbox_id: inboxId, message } = await req.json())
  } catch {
    return json({ error: 'bad-request' }, 400)
  }
  if (typeof inboxId !== 'string' || typeof message !== 'string' || !message.trim() || message.length > 10_000) {
    return json({ error: 'bad-request' }, 400)
  }

  const { data: inbox, error } = await admin.from('pesan_kontak').select('*').eq('id', inboxId).maybeSingle()
  if (error) return json({ error: 'server-error' }, 500)
  if (!inbox) return json({ error: 'not-found' }, 404)

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY') ?? ''}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('NOTIFICATION_EMAIL_FROM'),
      to: [inbox.email],
      reply_to: auth.user.email ?? undefined,
      subject: `Re: ${inbox.jenis_layanan || 'Your message'}`,
      text: message,
      html: `<div style="font-family:system-ui,sans-serif;white-space:pre-wrap">${escapeHtml(message)}</div>`,
    }),
  })
  if (!res.ok) {
    console.error('resend failed', res.status, await res.text())
    return json({ error: 'email-failed' }, 502)
  }

  const { data: updated, error: upErr } = await admin
    .from('pesan_kontak')
    .update({ dibalas_pada: new Date().toISOString(), status: 'ditindaklanjuti' })
    .eq('id', inboxId)
    .select()
    .single()
  if (upErr) return json({ error: 'server-error' }, 500)
  return json({ inbox: updated })
})
