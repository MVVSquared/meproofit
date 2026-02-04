-- Allow anyone to read daily_sentences (one row per date+grade, shared for all users).
-- Without this policy, RLS blocks SELECT and the app never finds existing rows, so it generates
-- a new sentence per user and tries to insert duplicates.
-- Run this in Supabase SQL Editor.

CREATE POLICY "Allow select daily sentences"
ON public.daily_sentences
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow upsert to update existing row when same date+grade already exists (first writer wins).
CREATE POLICY "Allow update daily sentences"
ON public.daily_sentences
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);
