-- =============================================================================
-- Admin dashboard + public slide portal schema (applied as migration 20261006090000).
--
-- Target project: `raydiansyah` (ref bvxvfgjgdoxmbwnsftnc), which is SHARED with
-- raydiansyah.com. That project already defines `private.is_admin()` and live
-- tables with Indonesian names (portofolio, keahlian, pesan_kontak,
-- slide_presentasi, profil_situs, ...). Review overlaps before applying; to apply,
-- move this file into the repo that owns migrations (~/Sites/personal/supabase/
-- migrations) with a fresh timestamp and run `supabase db push`.
--
-- Types: src/types/supabase.ts mirrors this file 1:1.
-- Security model:
--   * Admin = JWT app_metadata.role in ('admin','owner') via private.is_admin().
--   * Content tables: public can read published/active rows; only admins write.
--   * inboxes: anyone can INSERT (contact form), only admins read/update/delete.
--   * slides: NO public SELECT. Public uses get_public_slide() / verify_slide_access().
--     access_code stores a bcrypt hash; plain codes never leave the RPC.
--   * Storage: `slides` bucket is private; files are served via signed URLs.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- helpers
-- private.is_admin() already exists in the shared project (20260822073712) and is
-- reused as-is: select coalesce(auth.jwt()->'app_metadata'->>'role' in ('admin','owner'), false)
create schema if not exists private;

create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ------------------------------------------------------------------ enums
create type public.publish_status as enum ('draft', 'published');
create type public.slide_file_type as enum ('html', 'pdf', 'ppt');
create type public.slide_module as enum ('materi_kuliah', 'presentasi_klien', 'workshop');
create type public.inbox_status as enum ('unread', 'read', 'archived');
create type public.skill_category as enum ('frontend', 'backend', 'devops', 'design', 'teaching', 'other');

-- ----------------------------------------------------------------- tables
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  headline text,
  bio text,
  avatar_url text,
  email text,
  phone text,
  location text,
  social_links jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.settings (
  id smallint primary key default 1 check (id = 1), -- single row
  site_name text not null default 'Ray Diansyah',
  logo_url text,
  favicon_url text,
  legal_entity_name text,
  legal_entity_type text,
  legal_registration_number text,
  legal_address text,
  legal_email text,
  terms_md text,
  privacy_md text,
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict do nothing;

create table public.portfolios (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  category text not null,
  summary text,
  description text,
  thumbnail_url text,
  tech_stack text[] not null default '{}',
  live_url text,
  repo_url text,
  status public.publish_status not null default 'draft',
  featured boolean not null default false,
  view_count integer not null default 0,
  order_index integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  icon text not null default 'Globe',
  name text not null,
  description text,
  price_label text,
  tier text check (tier in ('basic', 'pro', 'enterprise')),
  is_active boolean not null default true,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inboxes (
  id uuid primary key default gen_random_uuid(),
  sender_name text not null check (char_length(sender_name) between 1 and 120),
  sender_email text not null check (char_length(sender_email) <= 254),
  subject text not null check (char_length(subject) between 1 and 200),
  body text not null check (char_length(body) between 1 and 5000),
  status public.inbox_status not null default 'unread',
  is_important boolean not null default false,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category public.skill_category not null default 'other',
  level smallint not null default 50 check (level between 0 and 100),
  icon_url text,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.slides (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  description text,
  presenter text,
  file_type public.slide_file_type not null,
  file_url text not null,            -- storage path in `slides` bucket, or https embed URL
  page_count integer,
  outline jsonb not null default '[]'::jsonb,
  access_code text,                  -- bcrypt hash (extensions.crypt), never plain text
  is_protected boolean not null default false,
  module_category public.slide_module not null,
  order_index integer not null default 0,
  allow_download boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint protected_needs_code check (not is_protected or access_code is not null)
);

create table public.slide_access_logs (
  id uuid primary key default gen_random_uuid(),
  slide_id uuid not null references public.slides (id) on delete cascade,
  accessed_at timestamptz not null default now(),
  ip_hash text,
  user_agent text,
  referrer text
);
create index slide_access_logs_slide_time on public.slide_access_logs (slide_id, accessed_at desc);

-- Failed-attempt ledger for rate limiting (not exposed to clients).
create table private.slide_access_attempts (
  slug text not null,
  ip_hash text not null,
  attempted_at timestamptz not null default now()
);
create index slide_access_attempts_lookup on private.slide_access_attempts (slug, ip_hash, attempted_at desc);

-- updated_at triggers
create trigger touch before update on public.profiles for each row execute function private.touch_updated_at();
create trigger touch before update on public.settings for each row execute function private.touch_updated_at();
create trigger touch before update on public.portfolios for each row execute function private.touch_updated_at();
create trigger touch before update on public.services for each row execute function private.touch_updated_at();
create trigger touch before update on public.skills for each row execute function private.touch_updated_at();
create trigger touch before update on public.slides for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.portfolios enable row level security;
alter table public.services enable row level security;
alter table public.inboxes enable row level security;
alter table public.skills enable row level security;
alter table public.slides enable row level security;
alter table public.slide_access_logs enable row level security;

-- Public reads of non-sensitive content
create policy "profiles: public read" on public.profiles for select using (true);
create policy "settings: public read" on public.settings for select using (true);
create policy "portfolios: public read published" on public.portfolios for select using (status = 'published' or (select private.is_admin()));
create policy "services: public read active" on public.services for select using (is_active or (select private.is_admin()));
create policy "skills: public read" on public.skills for select using (true);

-- Admin writes
create policy "profiles: admin write" on public.profiles for all using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "settings: admin write" on public.settings for update using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "portfolios: admin write" on public.portfolios for all using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "services: admin write" on public.services for all using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "skills: admin write" on public.skills for all using ((select private.is_admin())) with check ((select private.is_admin()));

-- Inbox: anyone may submit (always as unread, not important); only admins see it.
create policy "inboxes: anyone insert" on public.inboxes for insert to anon, authenticated
  with check (status = 'unread' and is_important = false and replied_at is null);
create policy "inboxes: admin read" on public.inboxes for select using ((select private.is_admin()));
create policy "inboxes: admin update" on public.inboxes for update using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "inboxes: admin delete" on public.inboxes for delete using ((select private.is_admin()));

-- Slides & logs: admin only (public goes through the RPCs below)
create policy "slides: admin all" on public.slides for all using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "slide logs: admin read" on public.slide_access_logs for select using ((select private.is_admin()));

-- ---------------------------------------------------------------- RPCs
-- Safe metadata for the gate screen (no file URL, no code).
create or replace function public.get_public_slide(p_slug text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'slug', s.slug, 'title', s.title, 'description', s.description, 'presenter', s.presenter,
    'file_type', s.file_type, 'is_protected', s.is_protected, 'module_category', s.module_category)
  from public.slides s
  where s.slug = p_slug and s.is_active;
$$;

-- Admin sets/clears the code; hashing happens here so plain codes never hit a table.
create or replace function public.set_slide_access_code(p_slide_id uuid, p_code text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_code is not null and char_length(p_code) < 6 then
    raise exception 'access code must be at least 6 characters';
  end if;
  update public.slides
     set access_code = case when p_code is null then null else extensions.crypt(upper(p_code), extensions.gen_salt('bf', 10)) end,
         is_protected = p_code is not null
   where id = p_slide_id;
end $$;

-- Verify code, rate-limit by hashed IP, log access, return metadata. The client then
-- requests a signed URL for the file (Edge Function or storage policy below).
create or replace function public.verify_slide_access(p_slug text, p_code text)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  s public.slides;
  headers jsonb := coalesce(current_setting('request.headers', true)::jsonb, '{}'::jsonb);
  ip text := split_part(coalesce(headers ->> 'x-forwarded-for', ''), ',', 1);
  ip_h text := encode(extensions.digest(ip || to_char(now(), 'YYYY-MM-DD'), 'sha256'), 'hex');
  recent int;
begin
  select * into s from public.slides where slug = p_slug and is_active;
  if not found then
    return null;
  end if;

  select count(*) into recent from private.slide_access_attempts
   where slug = p_slug and ip_hash = ip_h and attempted_at > now() - interval '1 minute';
  if recent >= 5 then
    raise exception 'rate_limited' using errcode = 'P0429';
  end if;

  if s.is_protected and (p_code is null or s.access_code <> extensions.crypt(upper(p_code), s.access_code)) then
    insert into private.slide_access_attempts (slug, ip_hash) values (p_slug, ip_h);
    return null;
  end if;

  insert into public.slide_access_logs (slide_id, ip_hash, user_agent, referrer)
  values (s.id, ip_h, left(headers ->> 'user-agent', 200), left(headers ->> 'referer', 300));

  return jsonb_build_object(
    'slide', to_jsonb(s) - 'access_code',
    -- Signed URL is minted by the `slide-url` Edge Function (service role) after this
    -- RPC succeeds; external embeds (https) are returned as-is.
    'signed_url', case when s.file_url like 'https://%' then s.file_url else null end,
    'expires_in', 3600);
end $$;

revoke all on function public.set_slide_access_code(uuid, text) from public, anon;
grant execute on function public.get_public_slide(text) to anon, authenticated;
grant execute on function public.verify_slide_access(text, text) to anon, authenticated;
grant execute on function public.set_slide_access_code(uuid, text) to authenticated;

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('branding', 'branding', true),
  ('portfolio-media', 'portfolio-media', true),
  ('skill-icons', 'skill-icons', true),
  ('slides', 'slides', false)
on conflict (id) do nothing;

-- Public buckets: anyone reads, only admins write.
create policy "public media: admin write" on storage.objects for all
  using (bucket_id in ('avatars', 'branding', 'portfolio-media', 'skill-icons') and (select private.is_admin()))
  with check (bucket_id in ('avatars', 'branding', 'portfolio-media', 'skill-icons') and (select private.is_admin()));

-- Private slides bucket: admins manage; nobody else lists or reads directly.
create policy "slides bucket: admin all" on storage.objects for all
  using (bucket_id = 'slides' and (select private.is_admin()))
  with check (bucket_id = 'slides' and (select private.is_admin()));
