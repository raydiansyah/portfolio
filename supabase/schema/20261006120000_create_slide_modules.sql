-- Content modules: group many slides (a course, a client engagement, a workshop series).
-- Additive only: new table + nullable FK on slides. Mirrors src/types/supabase.ts (ContentModule).

create table public.slide_modules (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null check (char_length(title) between 1 and 160),
  description text,
  category public.slide_module not null,
  cover_url text,
  is_published boolean not null default false,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger touch before update on public.slide_modules
  for each row execute function private.touch_updated_at();

alter table public.slides
  add column module_id uuid references public.slide_modules (id) on delete set null;
create index slides_module_order on public.slides (module_id, order_index);

alter table public.slide_modules enable row level security;

-- Public sees published modules only; admin policies are scoped to `authenticated`
-- because private.is_admin() is not executable by anon (see 20261006093000).
create policy "slide modules: public read published" on public.slide_modules
  for select to anon, authenticated using (is_published);
create policy "slide modules: admin all" on public.slide_modules
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- Module landing page: published module + its active slides, safe columns only
-- (no file_url, no access_code). Each deck is still opened via verify_slide_access().
create or replace function public.get_public_module(p_slug text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'module', jsonb_build_object('slug', m.slug, 'title', m.title, 'description', m.description,
                                 'category', m.category, 'cover_url', m.cover_url),
    'slides', coalesce((
      select jsonb_agg(jsonb_build_object(
               'slug', s.slug, 'title', s.title, 'description', s.description, 'presenter', s.presenter,
               'file_type', s.file_type, 'is_protected', s.is_protected, 'module_category', s.module_category,
               'order_index', s.order_index, 'page_count', s.page_count)
             order by s.order_index)
        from public.slides s
       where s.module_id = m.id and s.is_active), '[]'::jsonb))
  from public.slide_modules m
  where m.slug = p_slug and m.is_published;
$$;

grant execute on function public.get_public_module(text) to anon, authenticated;
