-- Module: Default admin role assignment
-- Purpose: Grant the requested Supabase admin role to the primary owner account
-- Used by: Supabase migration runner and private.is_admin() authorization checks
-- Dependencies: auth.users and existing raw_app_meta_data JSONB values
-- Public functions: None; migration-only metadata update
-- Side effects: Updates one auth user's app metadata; does not change passwords or sessions

update auth.users
set raw_app_meta_data = jsonb_set(
  coalesce(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb,
  true
)
where lower(email) = 'raydiansyah@gmail.com';
