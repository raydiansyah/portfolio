-- Module-level slide access: one access code unlocks a whole `material` and
-- returns its visible slides (with file keys) so the portal can list them and
-- move between decks without asking again.

-- Public slide metadata now names its module so a shared deck link can open
-- the module flow (code → module → list → play).
create or replace function public.get_public_slide(p_slug text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select private.slide_json(s, m)
           - array['id', 'module_id', 'file_url', 'outline', 'order_index', 'allow_download', 'is_active', 'created_at', 'updated_at', 'page_count']
           || jsonb_build_object('module_slug', m.slug)
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
                                 'category', m.kategori, 'cover_url', m.cover_url,
                                 'is_protected', m.akses_kode is not null),
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

create or replace function private.check_module_access(
  p_module text,
  p_code text,
  p_ip text
)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  m public.material;
  ip_h text := encode(extensions.digest(coalesce(p_ip, '') || to_char(now(), 'YYYY-MM-DD'), 'sha256'), 'hex');
  bucket text := 'module:' || p_module;
  recent int;
begin
  select * into m from public.material where slug = p_module and status_tampil;
  if not found then
    return jsonb_build_object('status', 'not-found');
  end if;

  if m.akses_berakhir_pada is not null and m.akses_berakhir_pada <= now() then
    return jsonb_build_object('status', 'expired');
  end if;

  select count(*) into recent from private.slide_access_attempts
   where slug = bucket and ip_hash = ip_h and attempted_at > now() - interval '1 minute';
  if recent >= 5 then
    return jsonb_build_object('status', 'rate-limited');
  end if;

  if m.akses_kode is not null and (p_code is null or p_code <> m.akses_kode) then
    insert into private.slide_access_attempts (slug, ip_hash) values (bucket, ip_h);
    return jsonb_build_object('status', 'wrong-code');
  end if;

  delete from private.slide_access_attempts where attempted_at < now() - interval '1 day';

  return jsonb_build_object(
    'status', 'ok',
    'module', jsonb_build_object('slug', m.slug, 'title', m.judul, 'description', nullif(m.deskripsi, ''),
                                 'category', m.kategori, 'cover_url', m.cover_url,
                                 'is_protected', m.akses_kode is not null),
    'slides', coalesce((
      select jsonb_agg(private.slide_json(s, m) order by s.urutan, s.dibuat_pada)
        from public.slide_presentasi s
       where s.material_id = m.id and s.status_tampil), '[]'::jsonb));
end $$;

-- Service-role entry point for the Edge Function (passes the real client IP).
create or replace function public.verify_module_access_as_service(p_module text, p_code text, p_ip text)
returns jsonb
language sql volatile security definer set search_path = ''
as $$
  select private.check_module_access(p_module, p_code, p_ip);
$$;

revoke all on function private.check_module_access(text, text, text) from public, anon, authenticated;
revoke all on function public.verify_module_access_as_service(text, text, text) from public, anon, authenticated;
grant execute on function public.verify_module_access_as_service(text, text, text) to service_role;
