-- Module: Admin authorization function grants
-- Purpose: Allow authenticated Supabase sessions to evaluate the private admin RLS helper
-- Used by: Supabase RLS policies that call private.is_admin()
-- Dependencies: private.is_admin() from 20260822073712_harden_admin_rls_and_activity.sql
-- Public functions: None; migration only
-- Side effects: Grants schema usage and function execution to authenticated sessions only

grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;
