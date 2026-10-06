-- Experiences (admin-managed work history) + Turnstile-protected contact form.

-- ---------------------------------------------------------------- experiences
create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  role text not null check (char_length(role) between 1 and 160),
  organization text not null check (char_length(organization) between 1 and 160),
  start_year smallint not null check (start_year between 1970 and 2100),
  end_year smallint check (end_year is null or end_year between 1970 and 2100),  -- null = present
  location text,
  summary text,
  stack text[] not null default '{}',
  order_index integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint experiences_years check (end_year is null or end_year >= start_year)
);

create trigger touch before update on public.experiences
  for each row execute function private.touch_updated_at();

alter table public.experiences enable row level security;
create policy "experiences: public read published" on public.experiences
  for select to anon, authenticated using (is_published);
create policy "experiences: admin all" on public.experiences
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- Seed from the static site content (idempotent on role + organization).
insert into public.experiences (role, organization, start_year, end_year, location, summary, stack, order_index)
select v.* from (values
  ('Web Developer', 'Freelance & product work', 2021, null, 'Surabaya / Remote', 'Design and build web platforms end to end — learning, certification and commerce systems — from data model to deployment.', array['Next.js', 'Laravel', 'MySQL', 'Docker']::text[], 0),
  ('IT Trainer & Assessor', 'Training institutions & certification bodies', 2019, null, 'Indonesia', 'Deliver programming and IT curricula for industry and government cohorts, and assess competency for professional certification.', array['Curriculum design', 'Python', 'Web fundamentals']::text[], 1),
  ('IT Support & Administrator', 'Institutional IT', 2014, 2019, 'Surabaya', 'Kept systems, networks and users running; built internal tools that replaced spreadsheets with small web apps.', array['Networking', 'PHP', 'MySQL']::text[], 2)
) as v(role, organization, start_year, end_year, location, summary, stack, order_index)
where not exists (select 1 from public.experiences x where x.role = v.role and x.organization = v.organization);

-- ------------------------------------------------------------- contact form
-- Inbox rows now arrive only through the `contact-submit` Edge Function, which
-- verifies Cloudflare Turnstile server-side. A direct anon insert would let bots
-- skip the CAPTCHA, so that policy is removed.
drop policy if exists "inboxes: anyone insert" on public.inboxes;

create table private.contact_attempts (
  ip_hash text not null,
  attempted_at timestamptz not null default now()
);
create index contact_attempts_lookup on private.contact_attempts (ip_hash, attempted_at desc);

-- Service-role entry point: rate limit (3 per 10 min, 10 per day per hashed IP),
-- validate lengths, insert as unread. Returns 'ok' | 'rate-limited'.
create or replace function public.submit_contact_as_service(
  p_name text, p_email text, p_subject text, p_body text, p_ip text
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

  insert into public.inboxes (sender_name, sender_email, subject, body)
  values (left(trim(p_name), 120), left(trim(p_email), 254), left(trim(p_subject), 200), left(trim(p_body), 5000));
  return 'ok';
end $$;

revoke all on function public.submit_contact_as_service(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_contact_as_service(text, text, text, text, text) to service_role;
