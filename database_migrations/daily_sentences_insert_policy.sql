-- Allow inserts into daily_sentences (fixes RLS "new row violates row-level security policy")
-- Run this in Supabase SQL Editor after enabling RLS on public.daily_sentences.
--
-- Why anon + authenticated: The app uses a separate Supabase client for DB calls; when users
-- sign in via AuthService (e.g. Google), that client may not have the session, so inserts run as anon.
-- daily_sentences are shared content (one row per date+grade), not user data, so allowing anon insert is acceptable.

CREATE POLICY "Allow insert daily sentences"
ON public.daily_sentences
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
