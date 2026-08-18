-- Skincare Analysis — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query) once
-- per project. Safe to re-run: every statement is guarded with IF NOT EXISTS /
-- DROP POLICY IF EXISTS so it can be reapplied after edits.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type routine_type as enum ('morning', 'evening');
exception when duplicate_object then null; end $$;

do $$ begin
  create type product_category as enum (
    'serum', 'moisturizer', 'cleanser', 'toner', 'sunscreen',
    'exfoliant', 'eye_cream', 'mask', 'oil', 'essence', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type scan_status as enum ('pending_review', 'categorized', 'complete', 'failed');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists ingredients (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null unique,
  inci_name text,
  aliases text[] not null default '{}',
  category text not null default 'other',
  comedogenic_rating smallint check (comedogenic_rating between 0 and 5),
  irritancy_rating smallint check (irritancy_rating between 0 and 5),
  benefit_score smallint check (benefit_score between 0 and 10),
  skin_type_fit text[] not null default '{}',
  description text,
  is_rated boolean not null default false,
  source text default 'auto-placeholder',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text,
  brand text,
  category product_category not null default 'other',
  raw_ocr_text text not null default '',
  ingredient_list_hash text not null unique,
  overall_score numeric,
  score_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_ingredients (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id),
  position int not null,
  raw_token text not null default '',
  match_score numeric,
  unique (product_id, position)
);
create index if not exists product_ingredients_ingredient_id_idx on product_ingredients(ingredient_id);

create table if not exists skin_fit_results (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  tag text not null,
  rank int not null,
  confidence numeric not null,
  unique (product_id, tag)
);

create table if not exists routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type routine_type not null,
  unique (user_id, type)
);

create table if not exists routine_items (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references routines(id) on delete cascade,
  product_id uuid not null references products(id),
  position int not null,
  unique (routine_id, product_id)
);
create index if not exists routine_items_routine_position_idx on routine_items(routine_id, position);

create table if not exists skin_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  skin_type text,
  concerns text[] not null default '{}'
);

create table if not exists scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid references products(id),
  ocr_raw_text text not null default '',
  status scan_status not null default 'pending_review',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table ingredients enable row level security;
alter table products enable row level security;
alter table product_ingredients enable row level security;
alter table skin_fit_results enable row level security;
alter table routines enable row level security;
alter table routine_items enable row level security;
alter table skin_profiles enable row level security;
alter table scans enable row level security;

-- Shared reference/catalog data: any signed-in user can read, and can also
-- insert (the app writes new products/ingredients/scores directly from the
-- browser since there is no server). No client-side update/delete.

drop policy if exists "ingredients_select" on ingredients;
create policy "ingredients_select" on ingredients for select to authenticated using (true);
drop policy if exists "ingredients_insert" on ingredients;
create policy "ingredients_insert" on ingredients for insert to authenticated with check (true);

drop policy if exists "products_select" on products;
create policy "products_select" on products for select to authenticated using (true);
drop policy if exists "products_insert" on products;
create policy "products_insert" on products for insert to authenticated with check (true);
drop policy if exists "products_update" on products;
create policy "products_update" on products for update to authenticated using (true) with check (true);

drop policy if exists "product_ingredients_select" on product_ingredients;
create policy "product_ingredients_select" on product_ingredients for select to authenticated using (true);
drop policy if exists "product_ingredients_insert" on product_ingredients;
create policy "product_ingredients_insert" on product_ingredients for insert to authenticated with check (true);

drop policy if exists "skin_fit_results_select" on skin_fit_results;
create policy "skin_fit_results_select" on skin_fit_results for select to authenticated using (true);
drop policy if exists "skin_fit_results_insert" on skin_fit_results;
create policy "skin_fit_results_insert" on skin_fit_results for insert to authenticated with check (true);

-- Per-user data: only the owning user may read/write their own rows.

drop policy if exists "routines_all" on routines;
create policy "routines_all" on routines for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "routine_items_all" on routine_items;
create policy "routine_items_all" on routine_items for all to authenticated
  using (exists (select 1 from routines r where r.id = routine_items.routine_id and r.user_id = auth.uid()))
  with check (exists (select 1 from routines r where r.id = routine_items.routine_id and r.user_id = auth.uid()));

drop policy if exists "skin_profiles_all" on skin_profiles;
create policy "skin_profiles_all" on skin_profiles for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "scans_all" on scans;
create policy "scans_all" on scans for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
