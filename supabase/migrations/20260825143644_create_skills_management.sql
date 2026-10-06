-- Module: Skills management schema
-- Purpose: Store ordered, publishable technology and AI skills for public profile display
-- Used by: Public About page, homepage profile content, and /dashboard/skills
-- Dependencies: private.is_admin(), private.record_admin_activity(), pgcrypto UUID generation
-- Public functions: None; creates keahlian table, policies, index, trigger, and seed rows
-- Side effects: Adds public-readable skill rows and admin-only mutation paths

create table public.keahlian (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (char_length(trim(nama)) between 1 and 80),
  kategori text not null default 'Engineering',
  urutan integer not null default 0 check (urutan >= 0),
  status_tampil boolean not null default true,
  dibuat_pada timestamptz not null default now(),
  diperbarui_pada timestamptz not null default now()
);

create index keahlian_public_order_idx
  on public.keahlian (status_tampil, urutan, dibuat_pada);

alter table public.keahlian enable row level security;

grant select on public.keahlian to anon, authenticated;
grant insert, update, delete on public.keahlian to authenticated;

create policy "public can read visible skills"
  on public.keahlian for select
  using (status_tampil = true);

create policy "admin can manage skills"
  on public.keahlian for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create trigger record_skill_activity
  after insert or update or delete on public.keahlian
  for each row execute function private.record_admin_activity();

insert into public.keahlian (nama, kategori, urutan)
values
  ('Git', 'Engineering', 1),
  ('CI/CD', 'Engineering', 2),
  ('JavaScript', 'Engineering', 3),
  ('Next.js', 'Engineering', 4),
  ('Nuxt.js', 'Engineering', 5),
  ('React', 'Engineering', 6),
  ('TanStack', 'Engineering', 7),
  ('Supabase', 'Backend', 8),
  ('PostgreSQL', 'Backend', 9),
  ('AI Automation', 'AI', 10),
  ('AI Assistant', 'AI', 11);
