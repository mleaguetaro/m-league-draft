-- Replace the email in is_admin() before running this file in Supabase SQL Editor.
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'change-to-your-email@example.com';
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create table if not exists public.team_settings (
  season text not null,
  id text not null check (id in ('a', 'b')),
  name text not null check (char_length(btrim(name)) between 1 and 24),
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  image_url text,
  photo_path text,
  primary key (season, id)
);

create table if not exists public.point_snapshots (
  id text primary key,
  season text not null,
  date date not null,
  recorded_at timestamptz not null,
  created_at timestamptz not null default now(),
  order_number double precision,
  source text not null default 'manual' check (source = 'manual'),
  points_by_player jsonb not null,
  stats_by_player jsonb not null default '{}'::jsonb
);

create index if not exists point_snapshots_season_date on public.point_snapshots (season, recorded_at);

alter table public.team_settings enable row level security;
alter table public.point_snapshots enable row level security;

grant select on public.team_settings, public.point_snapshots to anon, authenticated;
grant insert, update, delete on public.team_settings, public.point_snapshots to authenticated;

drop policy if exists "team public read" on public.team_settings;
drop policy if exists "team admin insert" on public.team_settings;
drop policy if exists "team admin update" on public.team_settings;
drop policy if exists "snapshot public read" on public.point_snapshots;
drop policy if exists "snapshot admin insert" on public.point_snapshots;
drop policy if exists "snapshot admin update" on public.point_snapshots;
drop policy if exists "snapshot admin delete" on public.point_snapshots;

create policy "team public read" on public.team_settings for select to anon, authenticated using (true);
create policy "team admin insert" on public.team_settings for insert to authenticated with check (public.is_admin());
create policy "team admin update" on public.team_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "snapshot public read" on public.point_snapshots for select to anon, authenticated using (true);
create policy "snapshot admin insert" on public.point_snapshots for insert to authenticated with check (public.is_admin());
create policy "snapshot admin update" on public.point_snapshots for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "snapshot admin delete" on public.point_snapshots for delete to authenticated using (public.is_admin());

insert into public.team_settings (season, id, name, color)
values ('2026-27', 'a', 'KUSUNOKI', '#c62828'), ('2026-27', 'b', 'KISHIMOTO', '#1565c0')
on conflict (season, id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('team-photos', 'team-photos', true, 1048576, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists "team photos admin insert" on storage.objects;
drop policy if exists "team photos admin select" on storage.objects;
drop policy if exists "team photos admin delete" on storage.objects;
create policy "team photos admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'team-photos' and public.is_admin());
create policy "team photos admin select" on storage.objects for select to authenticated
  using (bucket_id = 'team-photos' and public.is_admin());
create policy "team photos admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'team-photos' and public.is_admin());
