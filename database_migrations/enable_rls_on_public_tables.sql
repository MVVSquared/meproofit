-- Enable Row Level Security on public tables
-- Run this in Supabase SQL Editor to fix "Policy Exists RLS Disabled" and "RLS Disabled in Public" linter errors.
-- Your RLS policies already exist; this only turns RLS on for the tables.

ALTER TABLE public.daily_sentences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentence_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
