-- Module: Portfolio click analytics schema
-- Purpose: Store anonymous portfolio click events and expose admin-only daily aggregates
-- Used by: Public portfolio links and owner dashboard analytics
-- Dependencies: public.portofolio, private.is_admin(), auth roles
-- Public functions: None; creates portfolio_click and portfolio_click_daily
-- Side effects: Adds anonymous insert-only event storage and an indexed aggregate view

create table public.portfolio_click (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portofolio(id) on delete cascade,
  clicked_at timestamptz not null default now()
);

create index portfolio_click_portfolio_date_idx
  on public.portfolio_click (portfolio_id, clicked_at desc);

alter table public.portfolio_click enable row level security;
revoke all on table public.portfolio_click from anon, authenticated;
grant insert on table public.portfolio_click to anon, authenticated;
grant select on table public.portfolio_click to authenticated;

create policy "public can record visible portfolio clicks"
  on public.portfolio_click
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.portofolio
      where portofolio.id = portfolio_click.portfolio_id
        and portofolio.status_tampil = true
    )
  );

create policy "admin can read portfolio clicks"
  on public.portfolio_click
  for select
  to authenticated
  using ((select private.is_admin()));

create or replace view public.portfolio_click_daily
with (security_invoker = true)
as
select
  clicks.portfolio_id,
  portfolio.judul,
  (clicks.clicked_at at time zone 'Asia/Jakarta')::date as clicked_date,
  count(*)::integer as click_count
from public.portfolio_click as clicks
join public.portofolio as portfolio on portfolio.id = clicks.portfolio_id
group by clicks.portfolio_id, portfolio.judul, (clicks.clicked_at at time zone 'Asia/Jakarta')::date;

grant select on public.portfolio_click_daily to authenticated;
