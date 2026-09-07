-- RoadNoise public sharing schema.
-- Run this in Supabase SQL Editor, then add the project URL and publishable/anon key to config.js.

create extension if not exists pgcrypto;

create table if not exists public.roadnoise_shared (
  id uuid primary key default gen_random_uuid(),
  share_code text not null unique default encode(gen_random_bytes(8), 'hex'),
  car_name text not null check (char_length(btrim(car_name)) between 1 and 80),
  duration_seconds integer not null check (duration_seconds between 1 and 86400),
  sample_count integer not null check (sample_count between 1 and 20000),
  average_db numeric(5, 1) not null check (average_db between 0 and 140),
  p95_db numeric(5, 1) not null check (p95_db between 0 and 140),
  max_db numeric(5, 1) not null check (max_db between 0 and 140),
  speed_bands jsonb not null default '[]'::jsonb,
  samples jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint roadnoise_shared_samples_size check (jsonb_array_length(samples) <= 20000)
);

alter table public.roadnoise_shared enable row level security;

drop policy if exists "Anyone can read shared trips" on public.roadnoise_shared;
create policy "Anyone can read shared trips"
  on public.roadnoise_shared for select to anon, authenticated using (true);

drop policy if exists "Anyone can publish shared trips" on public.roadnoise_shared;
create policy "Anyone can publish shared trips"
  on public.roadnoise_shared for insert to anon, authenticated
  with check (char_length(btrim(car_name)) between 1 and 80);

create index if not exists roadnoise_shared_created_at_idx on public.roadnoise_shared (created_at desc);
create index if not exists roadnoise_shared_car_name_idx on public.roadnoise_shared (lower(car_name));

-- New Supabase projects may require explicit Data API exposure after running SQL.
grant select, insert on public.roadnoise_shared to anon, authenticated;
