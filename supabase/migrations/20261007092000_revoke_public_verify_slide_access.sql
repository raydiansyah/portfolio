-- Functions get EXECUTE granted to PUBLIC on creation; revoking from anon alone
-- (20261007090000) left the legacy direct RPC callable. Close it completely —
-- slide access goes through the `slide-access` Edge Function only.
revoke execute on function public.verify_slide_access(text, text) from public, anon, authenticated;
