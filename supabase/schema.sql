-- Bebe Bucks — Supabase schema
-- Run this in your Supabase project's SQL editor (SQL → New query → paste → Run).
-- Then put the project URL + anon key in a .env file (see .env.example) and the
-- app automatically switches from local demo mode to shared cloud mode.

-- People in the household (exactly two, but modeled as rows so names are editable).
create table if not exists people (
  id    text primary key,
  name  text not null,
  color text not null default '#0f766e'
);

create table if not exists accounts (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  type               text not null default 'savings',
  owner              text not null default 'joint',
  balance            numeric not null default 0,
  balance_updated_at timestamptz not null default now(),
  contributions      jsonb not null default '{}'::jsonb,
  sweep_day          int,
  goal_amount        numeric,
  annual_return_pct  numeric,
  notes              text not null default '',
  sort_order         int not null default 0
);

create table if not exists bills (
  id                         uuid primary key default gen_random_uuid(),
  name                       text not null,
  category                   text not null default 'Other',
  total                      numeric not null default 0,
  payer                      text not null default 'joint',
  due_bucket                 int not null default 1,
  due_day                    int,
  split_type                 text not null default 'even',
  custom_shares              jsonb not null default '{}'::jsonb,
  include_in_household_total boolean not null default true,
  active                     boolean not null default true,
  notes                      text not null default '',
  sort_order                 int not null default 0
);

create table if not exists settings (
  id             text primary key default 'household',
  household_name text not null default 'Bebe Bucks'
);

-- Row Level Security -------------------------------------------------------
-- This is a private two-person app: any signed-in user may read/write all
-- rows (you only ever create your own household's data). Sign-up should be
-- disabled in Supabase Auth settings so only the two of you have accounts.
alter table people   enable row level security;
alter table accounts enable row level security;
alter table bills    enable row level security;
alter table settings enable row level security;

do $$
declare t text;
begin
  foreach t in array array['people','accounts','bills','settings'] loop
    execute format(
      'drop policy if exists "authenticated full access" on %I;', t);
    execute format(
      'create policy "authenticated full access" on %I
         for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;
