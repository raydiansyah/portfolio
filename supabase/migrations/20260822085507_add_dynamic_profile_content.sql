-- Module: Dynamic profile content schema
-- Purpose: Store public profile, CV, experience, and toolkit content in Supabase
-- Used by: Public React profile and homepage queries
-- Dependencies: auth.jwt(), private.is_admin(), existing auth users
-- Public functions: None; SQL tables, policies, indexes, and initial content
-- Side effects: Creates public-read tables and admin-managed content records

create table public.profil_situs (
  id smallint primary key default 1 check (id = 1),
  label text not null,
  judul text not null,
  ringkasan text not null,
  url_cv text,
  url_github text,
  url_linkedin text,
  url_instagram text,
  toolkit text[] not null default '{}',
  status_tampil boolean not null default true,
  diperbarui_pada timestamptz not null default now()
);

create table public.pengalaman (
  id uuid primary key default gen_random_uuid(),
  periode text not null,
  judul text not null,
  ringkasan text not null,
  stack text not null,
  urutan integer not null default 0,
  status_tampil boolean not null default true,
  dibuat_pada timestamptz not null default now(),
  diperbarui_pada timestamptz not null default now()
);

create index pengalaman_public_order_idx on public.pengalaman (status_tampil, urutan, dibuat_pada);

alter table public.profil_situs enable row level security;
alter table public.pengalaman enable row level security;

create policy "public can read visible site profile" on public.profil_situs
  for select using (status_tampil = true);
create policy "public can read visible experience" on public.pengalaman
  for select using (status_tampil = true);
create policy "admin can manage site profile" on public.profil_situs
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy "admin can manage experience" on public.pengalaman
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

insert into public.profil_situs (id, label, judul, ringkasan, url_cv, url_github, url_linkedin, url_instagram, toolkit)
values (
  1,
  'About Suprayogo',
  'Good work starts with paying attention.',
  'Saya membangun pengalaman digital di persimpangan strategi, desain, dan teknologi — dengan perhatian pada konteks bisnis, bahasa yang jelas, dan detail yang terasa manusiawi.',
  '/cv-raydiansyah.txt',
  'https://github.com/raydiansyah',
  'https://www.linkedin.com/in/raydiansyah/',
  'https://www.instagram.com/raydiansyah/',
  array['JavaScript', 'TypeScript', 'React', 'Node.js', 'Supabase', 'Laravel', 'TanStack', 'Python', 'HTML', 'CSS']
)
on conflict (id) do update set
  label = excluded.label,
  judul = excluded.judul,
  ringkasan = excluded.ringkasan,
  url_cv = excluded.url_cv,
  url_github = excluded.url_github,
  url_linkedin = excluded.url_linkedin,
  url_instagram = excluded.url_instagram,
  toolkit = excluded.toolkit,
  diperbarui_pada = now();

insert into public.pengalaman (periode, judul, ringkasan, stack, urutan)
values
  ('NOW', 'Independent digital studio', 'Membangun website, aplikasi web, dan sistem digital untuk bisnis yang sedang bertumbuh.', 'React · TypeScript · Supabase', 1),
  ('2021—24', 'Product & web development', 'Menerjemahkan kebutuhan bisnis menjadi produk yang jelas, mudah dipakai, dan siap dikembangkan.', 'TanStack · Node.js · Laravel', 2),
  ('EARLIER', 'Designing useful systems', 'Membangun fondasi visual, alur kerja, dan pengalaman digital dengan perhatian pada detail.', 'UX · UI · Python', 3);
