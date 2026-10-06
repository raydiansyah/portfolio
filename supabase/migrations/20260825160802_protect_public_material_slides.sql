-- Module: Protected material slide access schema
-- Purpose: Store optional material access codes and prevent direct anonymous slide reads
-- Used by: verify-public-slide Edge Function and dashboard material creation
-- Dependencies: public.material, public.slide_presentasi
-- Public functions: None; schema changes and access policy updates
-- Side effects: Adds access metadata and moves public slide reads behind server verification

alter table public.material
  add column akses_kode text null,
  add column akses_berakhir_pada timestamptz null,
  add constraint material_access_code_length check (akses_kode is null or char_length(akses_kode) between 4 and 64);

create index material_access_expiry_idx on public.material (akses_berakhir_pada)
  where akses_kode is not null;

drop policy if exists "public can read visible slides" on public.slide_presentasi;
revoke select on table public.slide_presentasi from anon;
revoke select on table public.material from anon;
