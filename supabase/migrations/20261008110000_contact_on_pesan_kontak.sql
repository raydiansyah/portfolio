-- Contact messages live in the original `pesan_kontak` table (also written by
-- raydiansyah.com, separate repo). The harbor contact form and the admin Inbox
-- move onto it; the empty `inboxes` table from 2026-10-06 is dropped.

-- Admin-only flags used by the dashboard Inbox (additive; defaults keep the
-- other site's inserts valid).
alter table public.pesan_kontak
  add column if not exists penting boolean not null default false,
  add column if not exists dibalas_pada timestamptz;

drop policy if exists "admin can delete contacts" on public.pesan_kontak;
create policy "admin can delete contacts"
  on public.pesan_kontak for delete to authenticated
  using ((select private.is_admin()));
grant delete on public.pesan_kontak to authenticated;

-- Service-role entry point for the `contact-submit` Edge Function: rate limit
-- (3 per 10 min, 10 per day per hashed IP), trim lengths, insert as 'baru'.
drop function if exists public.submit_contact_as_service(text, text, text, text, text);
create or replace function public.submit_contact_as_service(
  p_name text, p_email text, p_phone text, p_service text, p_budget text, p_body text, p_ip text
)
returns text
language plpgsql volatile security definer set search_path = ''
as $$
declare
  ip_h text := encode(extensions.digest(coalesce(p_ip, '') || to_char(now(), 'YYYY-MM-DD'), 'sha256'), 'hex');
  recent int;
  today int;
begin
  select count(*) filter (where attempted_at > now() - interval '10 minutes'),
         count(*) filter (where attempted_at > now() - interval '1 day')
    into recent, today
    from private.contact_attempts where ip_hash = ip_h;
  if recent >= 3 or today >= 10 then
    return 'rate-limited';
  end if;

  insert into private.contact_attempts (ip_hash) values (ip_h);
  delete from private.contact_attempts where attempted_at < now() - interval '2 days';

  insert into public.pesan_kontak (nama, email, telepon, jenis_layanan, perkiraan_anggaran, pesan)
  values (
    left(trim(p_name), 120),
    left(trim(p_email), 254),
    nullif(left(trim(coalesce(p_phone, '')), 40), ''),
    nullif(left(trim(coalesce(p_service, '')), 120), ''),
    coalesce(nullif(left(trim(coalesce(p_budget, '')), 80), ''), 'Belum ditentukan'),
    left(trim(p_body), 5000)
  );
  return 'ok';
end $$;

revoke all on function public.submit_contact_as_service(text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_contact_as_service(text, text, text, text, text, text, text) to service_role;

drop table if exists public.inboxes;
