-- Migration: add created_by to intro and enable RLS with owner/super_admin policies

BEGIN;

-- Add created_by column (nullable to avoid failing existing rows)
ALTER TABLE IF EXISTS public.intro
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Ensure `created_at` exists for ordering if needed
ALTER TABLE IF EXISTS public.intro
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Enable RLS on the table
ALTER TABLE IF EXISTS public.intro ENABLE ROW LEVEL SECURITY;

-- Revoke default public access if any (optional)
REVOKE ALL ON TABLE public.intro FROM PUBLIC;

-- Create policy helpers: use DO blocks so duplicate policy creation won't fail
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'intro' AND policyname = 'Intro - select by owner or super_admin'
  ) THEN
    CREATE POLICY "Intro - select by owner or super_admin" ON public.intro
      FOR SELECT
      USING (created_by::text = auth.uid()::text OR (auth.jwt() ->> 'role') = 'super_admin');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'intro' AND policyname = 'Intro - insert by authenticated'
  ) THEN
    CREATE POLICY "Intro - insert by authenticated" ON public.intro
      FOR INSERT
      WITH CHECK (created_by::text = auth.uid()::text OR (auth.jwt() ->> 'role') = 'super_admin');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'intro' AND policyname = 'Intro - update by owner or super_admin'
  ) THEN
    CREATE POLICY "Intro - update by owner or super_admin" ON public.intro
      FOR UPDATE
      USING (created_by::text = auth.uid()::text OR (auth.jwt() ->> 'role') = 'super_admin')
      WITH CHECK (created_by::text = auth.uid()::text OR (auth.jwt() ->> 'role') = 'super_admin');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'intro' AND policyname = 'Intro - delete by owner or super_admin'
  ) THEN
    CREATE POLICY "Intro - delete by owner or super_admin" ON public.intro
      FOR DELETE
      USING (created_by::text = auth.uid()::text OR (auth.jwt() ->> 'role') = 'super_admin');
  END IF;
END$$;

COMMIT;
