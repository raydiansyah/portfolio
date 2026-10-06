-- Module: Material and ordered slide collections schema
-- Purpose: Group course slides into materials and persist their display order
-- Used by: Dashboard slide management and public slide queries
-- Dependencies: public.slide_presentasi, private.is_admin(), auth.users
-- Public functions: None; SQL tables, policies, indexes, and constraints
-- Side effects: Adds material records and nullable slide grouping/order fields

create table public.material (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  slug text not null unique,
  deskripsi text not null default '',
  status_tampil boolean not null default true,
  created_by uuid not null references auth.users(id),
  dibuat_pada timestamptz not null default now(),
  diperbarui_pada timestamptz not null default now()
);

alter table public.slide_presentasi
  add column material_id uuid references public.material(id) on delete set null,
  add column urutan integer not null default 0 check (urutan >= 0);

create index material_public_order_idx on public.material (status_tampil, dibuat_pada desc);
create index slide_material_order_idx on public.slide_presentasi (material_id, urutan, dibuat_pada);

alter table public.material enable row level security;
revoke all on table public.material from anon, authenticated;
grant select on table public.material to anon, authenticated;
grant insert, update, delete on table public.material to authenticated;
drop policy if exists "public can read visible materials" on public.material;
create policy "public can read visible materials" on public.material
  for select using (status_tampil = true);
drop policy if exists "admin can manage materials" on public.material;
create policy "admin can manage materials" on public.material
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "public can read visible slides" on public.slide_presentasi;
create policy "public can read visible slides" on public.slide_presentasi
  for select using (
    status_tampil = true
    and (material_id is null or exists (
      select 1 from public.material m
      where m.id = slide_presentasi.material_id and m.status_tampil = true
    ))
  );
