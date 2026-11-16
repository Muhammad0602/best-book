-- Best Book: database for personal Quran annotations.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> Run.
-- It is safe to run again.

create table if not exists public.annotations (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  surah_number smallint not null check (surah_number between 1 and 114),
  ayah_number smallint not null check (ayah_number between 1 and 286),
  -- 'highlight' and 'drawing' today; bookmarks, notes, teacher corrections
  -- and so on can be added later as new types without changing the table.
  type text not null check (char_length(type) between 1 and 40),
  -- highlight: { "text": "ar" | "en", "edition", "start", "end", "color" }
  --            start/end are word indexes inside the ayah.
  -- drawing:   { "anchor": { "text", "word" }, "strokes": [[[x, y], ...]], "color", "width" }
  --            points are offsets from the anchor word, measured in word heights.
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists annotations_user_place
  on public.annotations (user_id, surah_number, ayah_number);

-- Row Level Security: a signed-in user can only see and change their own rows.
alter table public.annotations enable row level security;

drop policy if exists "read own annotations" on public.annotations;
create policy "read own annotations" on public.annotations
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "add own annotations" on public.annotations;
create policy "add own annotations" on public.annotations
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "change own annotations" on public.annotations;
create policy "change own annotations" on public.annotations
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "delete own annotations" on public.annotations;
create policy "delete own annotations" on public.annotations
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Visitors who are not signed in get nothing at all.
revoke all on public.annotations from anon;
grant select, insert, update, delete on public.annotations to authenticated;
