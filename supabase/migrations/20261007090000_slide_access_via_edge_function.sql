-- Slide access through the `slide-access` Edge Function.
--
-- Why: files in the private `slides` bucket need a signed URL, which only the
-- service role can mint. When the Edge Function calls the RPC, PostgREST sees
-- the function's IP, so per-visitor rate limiting must receive the client IP
-- explicitly. The shared logic moves to private.check_slide_access(); the
-- service-role entry point passes the real client IP, user agent and referrer.

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
  s public.slides;
  ip_h text := encode(extensions.digest(coalesce(p_ip, '') || to_char(now(), 'YYYY-MM-DD'), 'sha256'), 'hex');
  recent int;
begin
  select * into s from public.slides where slug = p_slug and is_active;
  if not found then
    return jsonb_build_object('status', 'not-found');
  end if;

  select count(*) into recent from private.slide_access_attempts
   where slug = p_slug and ip_hash = ip_h and attempted_at > now() - interval '1 minute';
  if recent >= 5 then
    return jsonb_build_object('status', 'rate-limited');
  end if;

  if s.is_protected and (p_code is null or s.access_code <> extensions.crypt(upper(p_code), s.access_code)) then
    insert into private.slide_access_attempts (slug, ip_hash) values (p_slug, ip_h);
    return jsonb_build_object('status', 'wrong-code');
  end if;

  insert into public.slide_access_logs (slide_id, ip_hash, user_agent, referrer)
  values (s.id, ip_h, left(p_user_agent, 200), left(p_referrer, 300));

  -- Prune old attempt rows opportunistically (keeps the ledger tiny).
  delete from private.slide_access_attempts where attempted_at < now() - interval '1 day';

  return jsonb_build_object('status', 'ok', 'slide', to_jsonb(s) - 'access_code');
end $$;

-- Service-role entry point used by the Edge Function.
create or replace function public.verify_slide_access_as_service(
  p_slug text,
  p_code text,
  p_ip text,
  p_user_agent text,
  p_referrer text
)
returns jsonb
language sql volatile security definer set search_path = ''
as $$
  select private.check_slide_access(p_slug, p_code, p_ip, p_user_agent, p_referrer);
$$;

revoke all on function public.verify_slide_access_as_service(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.verify_slide_access_as_service(text, text, text, text, text) to service_role;
revoke all on function private.check_slide_access(text, text, text, text, text) from public, anon, authenticated;

-- The direct anon RPC is superseded by the Edge Function (correct per-visitor
-- rate limiting + signed URLs). Remove anon access to avoid a second brute-force path.
revoke execute on function public.verify_slide_access(text, text) from anon, authenticated;

-- Admin "views" counter for portfolio cards (public, idempotent per call).
create or replace function public.increment_portfolio_view(p_slug text)
returns void
language sql volatile security definer set search_path = ''
as $$
  update public.portfolios set view_count = view_count + 1 where slug = p_slug and status = 'published';
$$;
grant execute on function public.increment_portfolio_view(text) to anon, authenticated;
