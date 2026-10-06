-- Slides live in the original `material` (= content module) and `slide_presentasi`
-- (= slide) tables, which already hold the published decks and are also read by
-- raydiansyah.com (separate repo). This migration:
--   * adds optional columns the admin dashboard uses (additive, defaults keep the
--     other site's inserts valid),
--   * points the public RPCs and the slide-access check at these tables
--     (access code + expiry stay per material, compared as stored),
--   * drops the empty `slides` / `slide_modules` tables introduced on 2026-10-06.
-- Files stay in Cloudflare R2; `storage_path` is relative to its public base URL.

-- ------------------------------------------------------------- columns
alter table public.material
  add column if not exists kategori public.slide_module not null default 'materi_kuliah',
  add column if not exists urutan integer not null default 0,
  add column if not exists cover_url text;

alter table public.slide_presentasi
  add column if not exists deskripsi text,
  add column if not exists presenter text,
  add column if not exists outline jsonb not null default '[]'::jsonb,
  add column if not exists jumlah_halaman integer check (jumlah_halaman is null or jumlah_halaman > 0),
  add column if not exists izinkan_unduh boolean not null default false;

-- Keep material.diperbarui_pada current on admin edits.
create or replace function private.touch_diperbarui_pada()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.diperbarui_pada := now();
  return new;
end $$;

drop trigger if exists material_touch on public.material;
create trigger material_touch before update on public.material
  for each row execute function private.touch_diperbarui_pada();

-- anon never writes slides (RLS already denies; remove the stray grants too).
revoke insert, update, delete, truncate, references, trigger on public.slide_presentasi from anon;

-- ------------------------------------------------------ access log target
alter table public.slide_access_logs drop constraint if exists slide_access_logs_slide_id_fkey;
alter table public.slide_access_logs
  add constraint slide_access_logs_slide_id_fkey
  foreign key (slide_id) references public.slide_presentasi (id) on delete cascade;

-- ------------------------------------------------- drop superseded objects
drop function if exists public.verify_slide_access(text, text);
drop function if exists public.set_slide_access_code(uuid, text);
drop table if exists public.slides;
drop table if exists public.slide_modules;

-- ------------------------------------------------------------- helpers
-- Dashboard/portal shape of a slide row (English keys used by the frontend).
create or replace function private.slide_json(s public.slide_presentasi, m public.material)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', s.id,
    'module_id', s.material_id,
    'slug', s.slug,
    'title', s.judul,
    'description', s.deskripsi,
    'presenter', s.presenter,
    'file_type', case when s.mime_type = 'application/pdf' then 'pdf' else 'html' end,
    'file_url', s.storage_path,
    'page_count', s.jumlah_halaman,
    'outline', s.outline,
    'is_protected', coalesce(m.akses_kode is not null, false),
    'module_category', coalesce(m.kategori, 'materi_kuliah'),
    'order_index', s.urutan,
    'allow_download', s.izinkan_unduh,
    'is_active', s.status_tampil,
    'created_at', s.dibuat_pada,
    'updated_at', s.dibuat_pada
  );
$$;

-- ---------------------------------------------------------- public RPCs
create or replace function public.get_public_slide(p_slug text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select private.slide_json(s, m)
           - array['id', 'module_id', 'file_url', 'outline', 'order_index', 'allow_download', 'is_active', 'created_at', 'updated_at', 'page_count']
  from public.slide_presentasi s
  left join public.material m on m.id = s.material_id
  where s.slug = p_slug and s.status_tampil
    and (s.material_id is null or m.status_tampil);
$$;

create or replace function public.get_public_module(p_slug text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'module', jsonb_build_object('slug', m.slug, 'title', m.judul, 'description', nullif(m.deskripsi, ''),
                                 'category', m.kategori, 'cover_url', m.cover_url),
    'slides', coalesce((
      select jsonb_agg(
               private.slide_json(s, m)
                 - array['id', 'module_id', 'file_url', 'outline', 'allow_download', 'is_active', 'created_at', 'updated_at']
               order by s.urutan, s.dibuat_pada)
        from public.slide_presentasi s
       where s.material_id = m.id and s.status_tampil), '[]'::jsonb))
  from public.material m
  where m.slug = p_slug and m.status_tampil;
$$;

grant execute on function public.get_public_slide(text) to anon, authenticated;
grant execute on function public.get_public_module(text) to anon, authenticated;

-- ------------------------------------------------------ access check
create or replace function private.check_slide_access(
  p_slug text,
  p_code text,
  p_ip text,
  p_user_agent text,
  p_referrer text
)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  s public.slide_presentasi;
  m public.material;
  ip_h text := encode(extensions.digest(coalesce(p_ip, '') || to_char(now(), 'YYYY-MM-DD'), 'sha256'), 'hex');
  recent int;
begin
  select * into s from public.slide_presentasi where slug = p_slug and status_tampil;
  if not found then
    return jsonb_build_object('status', 'not-found');
  end if;
  if s.material_id is not null then
    select * into m from public.material where id = s.material_id and status_tampil;
    if not found then
      return jsonb_build_object('status', 'not-found');
    end if;
  end if;

  if m.akses_berakhir_pada is not null and m.akses_berakhir_pada <= now() then
    return jsonb_build_object('status', 'expired');
  end if;

  select count(*) into recent from private.slide_access_attempts
   where slug = p_slug and ip_hash = ip_h and attempted_at > now() - interval '1 minute';
  if recent >= 5 then
    return jsonb_build_object('status', 'rate-limited');
  end if;

  if m.akses_kode is not null and (p_code is null or p_code <> m.akses_kode) then
    insert into private.slide_access_attempts (slug, ip_hash) values (p_slug, ip_h);
    return jsonb_build_object('status', 'wrong-code');
  end if;

  insert into public.slide_access_logs (slide_id, ip_hash, user_agent, referrer)
  values (s.id, ip_h, left(p_user_agent, 200), left(p_referrer, 300));

  delete from private.slide_access_attempts where attempted_at < now() - interval '1 day';

  return jsonb_build_object('status', 'ok', 'slide', private.slide_json(s, m));
end $$;

revoke all on function private.check_slide_access(text, text, text, text, text) from public, anon, authenticated;
revoke all on function private.slide_json(public.slide_presentasi, public.material) from public, anon, authenticated;
