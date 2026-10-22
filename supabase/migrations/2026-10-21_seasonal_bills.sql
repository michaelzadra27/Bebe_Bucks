-- Migration: add seasonal (month-by-month) bill amounts.
-- Run this ONCE in your Supabase SQL editor if your project was created before
-- the seasonal feature (i.e. your bills table has no estimate_mode / monthly).
-- Safe to run more than once.

alter table bills add column if not exists estimate_mode text not null default 'flat';
alter table bills add column if not exists monthly jsonb not null default '{}'::jsonb;
