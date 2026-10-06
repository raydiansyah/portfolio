# Supabase schema (mirror)

Migrations for the shared `raydiansyah` Supabase project are owned by
`~/Sites/personal/supabase/migrations` (the linked CLI workdir). This folder is a
read-only mirror of the migrations that back the portfolio admin dashboard and
slide portal, so the types in `src/types/supabase.ts` can be reviewed alongside
the SQL. Applied to production on 2026-10-06:

- `20261006090000_create_admin_dashboard_and_slide_portal.sql`
- `20261006093000_scope_admin_policies_to_authenticated.sql`

Change the schema in `~/Sites/personal` and copy the new file here.
