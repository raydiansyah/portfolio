-- Module: raydiansyah.com initial Supabase schema
-- Purpose: Create public content tables and least-privilege RLS policies from the PRD
-- Used by: Supabase CLI migration runner
-- Dependencies: Supabase auth.users; Cloudflare R2 stores slide bytes outside Supabase
-- Public functions: None; SQL migration only
-- Side effects: Creates tables, indexes, policies, and public-read storage bucket
create type public.portfolio_category as enum ('aplikasi-web', 'website', 'company-profile');

create table public.portofolio (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  slug text not null unique,
  kategori public.portfolio_category not null,
  ringkasan text not null,
  url_gambar text,
  teknologi text[] not null default '{}',
  tujuan text,
  tantangan text,
  solusi text,
  url_demo text,
  durasi text,
  galeri text[] not null default '{}',
  status_tampil boolean not null default true,
  tanggal timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index portofolio_public_filter_idx on public.portofolio (kategori, status_tampil, tanggal desc);

create table public.testimoni (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  jabatan text,
  kutipan text not null,
  status_tampil boolean not null default true,
  tanggal timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index testimoni_public_idx on public.testimoni (status_tampil, tanggal desc);

create table public.pesan_kontak (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  email text not null,
  telepon text,
  jenis_layanan text,
  perkiraan_anggaran text not null default 'Belum ditentukan',
  pesan text not null,
  status text not null default 'baru' check (status in ('baru','dibaca','ditindaklanjuti','arsip')),
  dibuat_pada timestamptz not null default now()
);
create index pesan_kontak_status_idx on public.pesan_kontak (status, dibuat_pada desc);

alter table public.portofolio enable row level security;
alter table public.testimoni enable row level security;
alter table public.pesan_kontak enable row level security;
create policy "public can read visible portfolio" on public.portofolio for select using (status_tampil = true);
create policy "public can read visible testimonials" on public.testimoni for select using (status_tampil = true);
create policy "public can submit contact" on public.pesan_kontak for insert with check (true);

create policy "owner can manage portfolio" on public.portofolio for all to authenticated using (auth.uid() = created_by) with check (auth.uid() = created_by);
create policy "owner can manage testimonials" on public.testimoni for all to authenticated using (auth.uid() = created_by) with check (auth.uid() = created_by);
create policy "owner can read contacts" on public.pesan_kontak for select to authenticated using (true);
create policy "owner can update contacts" on public.pesan_kontak for update to authenticated using (true) with check (true);

create table public.slide_presentasi (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  slug text not null unique,
  storage_path text not null,
  mime_type text not null check (mime_type in ('text/html', 'application/pdf')),
  status_tampil boolean not null default true,
  created_by uuid not null references auth.users(id),
  dibuat_pada timestamptz not null default now()
);
create table public.langganan (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text not null default 'aktif' check (status in ('aktif', 'berhenti')),
  created_by uuid references auth.users(id),
  dibuat_pada timestamptz not null default now()
);
create index langganan_status_idx on public.langganan (status, dibuat_pada desc);
alter table public.langganan enable row level security;
create policy "public can subscribe" on public.langganan for insert with check (true);
create policy "owner can manage subscribers" on public.langganan for all to authenticated using (true) with check (true);
alter table public.slide_presentasi enable row level security;
create policy "public can read visible slides" on public.slide_presentasi for select using (status_tampil = true);
create policy "owner can manage slides" on public.slide_presentasi for all to authenticated using (auth.uid() = created_by) with check (auth.uid() = created_by);
