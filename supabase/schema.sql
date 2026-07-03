-- Elsway Icons CMS — Supabase schema
-- Run this once in the Supabase SQL editor for your project.

-- 1. Metadata table
create table if not exists public.icons (
  name          text primary key,
  categories    text[] not null default '{}',
  tags          text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    text
);

create index if not exists icons_categories_gin on public.icons using gin (categories);
create index if not exists icons_tags_gin       on public.icons using gin (tags);

-- 2. Auto-update updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_icons_touch on public.icons;
create trigger trg_icons_touch
  before update on public.icons
  for each row execute procedure public.touch_updated_at();

-- 3. RLS: public read, cars24.com-authenticated write
alter table public.icons enable row level security;

drop policy if exists icons_read on public.icons;
create policy icons_read on public.icons
  for select using (true);

drop policy if exists icons_write on public.icons;
create policy icons_write on public.icons
  for all
  to authenticated
  using (auth.jwt() ->> 'email' like '%@cars24.com')
  with check (auth.jwt() ->> 'email' like '%@cars24.com');

-- 4. Storage bucket policies (bucket "elsway-icons" must be created via dashboard as public).
--    Apply these in Storage → Policies.

/* -- Read (anyone):
create policy "icons public read"
  on storage.objects for select
  using (bucket_id = 'elsway-icons');

-- Write / update / delete (cars24.com signed-in only):
create policy "icons cars24 write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'elsway-icons'
    and auth.jwt() ->> 'email' like '%@cars24.com'
  );

create policy "icons cars24 update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'elsway-icons'
    and auth.jwt() ->> 'email' like '%@cars24.com'
  );

create policy "icons cars24 delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'elsway-icons'
    and auth.jwt() ->> 'email' like '%@cars24.com'
  );
*/
