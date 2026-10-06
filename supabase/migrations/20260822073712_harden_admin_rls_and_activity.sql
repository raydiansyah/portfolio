-- Module: Admin security hardening migration
-- Purpose: Restrict owner data to admin/owner JWT roles and record admin mutations
-- Used by: Supabase migration runner for the production database
-- Dependencies: auth.jwt(), auth.uid(), existing public content tables
-- Public functions: None; private.is_admin() and private.record_admin_activity() are internal helpers
-- Side effects: Replaces broad authenticated policies, creates an audit table, and adds mutation triggers

create schema if not exists private;

create extension if not exists pg_cron with schema extensions;

drop policy if exists "public can submit contact" on public.pesan_kontak;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'owner'), false);
$$;

revoke all on function private.is_admin() from public;

drop policy if exists "owner can manage portfolio" on public.portofolio;
create policy "admin can manage portfolio"
  on public.portofolio for all to authenticated
  using ((select private.is_admin()) and ((select auth.uid()) = created_by or (select private.is_admin())))
  with check ((select private.is_admin()) and ((select auth.uid()) = created_by or (select private.is_admin())));

drop policy if exists "owner can manage testimonials" on public.testimoni;
create policy "admin can manage testimonials"
  on public.testimoni for all to authenticated
  using ((select private.is_admin()) and ((select auth.uid()) = created_by or (select private.is_admin())))
  with check ((select private.is_admin()) and ((select auth.uid()) = created_by or (select private.is_admin())));

drop policy if exists "owner can read contacts" on public.pesan_kontak;
create policy "admin can read contacts"
  on public.pesan_kontak for select to authenticated
  using ((select private.is_admin()));

drop policy if exists "owner can update contacts" on public.pesan_kontak;
create policy "admin can update contacts"
  on public.pesan_kontak for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "owner can manage subscribers" on public.langganan;
create policy "admin can manage subscribers"
  on public.langganan for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "owner can manage slides" on public.slide_presentasi;
create policy "admin can manage slides"
  on public.slide_presentasi for all to authenticated
  using ((select private.is_admin()) and ((select auth.uid()) = created_by or (select private.is_admin())))
  with check ((select private.is_admin()) and ((select auth.uid()) = created_by or (select private.is_admin())));

create table if not exists public.admin_activity (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  entity text not null,
  entity_id uuid,
  occurred_at timestamptz not null default now()
);

alter table public.admin_activity enable row level security;
drop policy if exists "admin can read activity" on public.admin_activity;
create policy "admin can read activity"
  on public.admin_activity for select to authenticated
  using ((select private.is_admin()));

create or replace function private.record_admin_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.admin_activity (actor_id, action, entity, entity_id)
  values (
    (select auth.uid()),
    tg_op,
    tg_table_name,
    case when tg_op = 'DELETE' then old.id else new.id end
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.record_admin_activity() from public;

create or replace function private.purge_expired_contact_data()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.pesan_kontak
  where dibuat_pada < now() - interval '24 months';
$$;

revoke all on function private.purge_expired_contact_data() from public;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id from cron.job where jobname = 'purge-contact-data-24-months';
  if existing_job_id is not null then perform cron.unschedule(existing_job_id); end if;
  perform cron.schedule('purge-contact-data-24-months', '15 2 * * *', 'select private.purge_expired_contact_data()');
end $$;

drop trigger if exists record_portfolio_activity on public.portofolio;
create trigger record_portfolio_activity
  after insert or update or delete on public.portofolio
  for each row execute function private.record_admin_activity();

drop trigger if exists record_testimonial_activity on public.testimoni;
create trigger record_testimonial_activity
  after insert or update or delete on public.testimoni
  for each row execute function private.record_admin_activity();

drop trigger if exists record_slide_activity on public.slide_presentasi;
create trigger record_slide_activity
  after insert or update or delete on public.slide_presentasi
  for each row execute function private.record_admin_activity();

drop trigger if exists record_subscription_activity on public.langganan;
create trigger record_subscription_activity
  after insert or update or delete on public.langganan
  for each row execute function private.record_admin_activity();
