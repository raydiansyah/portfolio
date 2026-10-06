-- Projects live in the original `portofolio` table (also read by raydiansyah.com,
-- separate repo); project views are rows in `portfolio_click`. The harbor and
-- the admin Portfolio module move onto them. `portfolios` (2026-10-06) is no
-- longer read by the app but is kept: it holds drafts that exist only there.

-- Admin-only fields (additive; defaults keep the other site's inserts valid).
alter table public.portofolio
  add column if not exists unggulan boolean not null default false,
  add column if not exists urutan integer not null default 0,
  add column if not exists url_repo text;

-- Feature the four projects the harbor already showcased on Portfolio Island.
update public.portofolio set unggulan = true
 where slug in ('titikjiwa', 'lsp-tik', 'pay-one-official', 'mau-nabung');

-- Order newest first by default (admins reorder later).
with ranked as (
  select id, row_number() over (order by tanggal desc) - 1 as n from public.portofolio
)
update public.portofolio p set urutan = ranked.n from ranked where ranked.id = p.id;

-- anon never writes projects (RLS already denies; drop the stray grants too).
revoke insert, update, delete, truncate, references, trigger on public.portofolio from anon;

-- The view counter on `portfolios` is replaced by `portfolio_click` rows.
drop function if exists public.increment_portfolio_view(text);
