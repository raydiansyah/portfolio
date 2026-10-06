-- Fix for 20261006090000: private.is_admin() is executable only by `authenticated`
-- (see 20260822100000). Policies that call it without a role clause are evaluated for
-- `anon` too and raise "permission denied for function is_admin" instead of filtering.
-- Split public reads (no is_admin call) from admin policies scoped to `authenticated`.

-- portfolios
drop policy "portfolios: public read published" on public.portfolios;
drop policy "portfolios: admin write" on public.portfolios;
create policy "portfolios: public read published" on public.portfolios for select to anon, authenticated using (status = 'published');
create policy "portfolios: admin all" on public.portfolios for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- services
drop policy "services: public read active" on public.services;
drop policy "services: admin write" on public.services;
create policy "services: public read active" on public.services for select to anon, authenticated using (is_active);
create policy "services: admin all" on public.services for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- profiles / settings / skills (public read already role-agnostic without is_admin)
drop policy "profiles: admin write" on public.profiles;
create policy "profiles: admin write" on public.profiles for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
drop policy "settings: admin write" on public.settings;
create policy "settings: admin write" on public.settings for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
drop policy "skills: admin write" on public.skills;
create policy "skills: admin write" on public.skills for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- inboxes (anon keeps insert-only)
drop policy "inboxes: admin read" on public.inboxes;
drop policy "inboxes: admin update" on public.inboxes;
drop policy "inboxes: admin delete" on public.inboxes;
create policy "inboxes: admin read" on public.inboxes for select to authenticated using ((select private.is_admin()));
create policy "inboxes: admin update" on public.inboxes for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "inboxes: admin delete" on public.inboxes for delete to authenticated using ((select private.is_admin()));

-- slides & logs: admin only
drop policy "slides: admin all" on public.slides;
create policy "slides: admin all" on public.slides for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
drop policy "slide logs: admin read" on public.slide_access_logs;
create policy "slide logs: admin read" on public.slide_access_logs for select to authenticated using ((select private.is_admin()));

-- storage
drop policy "public media: admin write" on storage.objects;
drop policy "slides bucket: admin all" on storage.objects;
create policy "public media: admin write" on storage.objects for all to authenticated
  using (bucket_id in ('avatars', 'branding', 'portfolio-media', 'skill-icons') and (select private.is_admin()))
  with check (bucket_id in ('avatars', 'branding', 'portfolio-media', 'skill-icons') and (select private.is_admin()));
create policy "slides bucket: admin all" on storage.objects for all to authenticated
  using (bucket_id = 'slides' and (select private.is_admin()))
  with check (bucket_id = 'slides' and (select private.is_admin()));
