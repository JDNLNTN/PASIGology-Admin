-- Migration: create user_roles helper table used by RLS policies (if missing)
BEGIN;

-- Create a simple lookup table for user roles. Use text for user_id to be permissive
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id text PRIMARY KEY,
  role text NOT NULL
);

COMMIT;

-- Make user_roles RLS-compliant: only allow reads by the owner or super_admin, and
-- allow INSERT/UPDATE/DELETE only by super_admins. Use DO blocks to create policies
-- safely if the migration is re-run.

BEGIN;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_roles FROM PUBLIC;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'UserRoles - select by owner or super_admin'
  ) THEN
    CREATE POLICY "UserRoles - select by owner or super_admin" ON public.user_roles
      FOR SELECT
      USING (user_id::text = auth.uid()::text OR (auth.jwt() ->> 'role') = 'super_admin');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'UserRoles - super_admin modifications'
  ) THEN
    CREATE POLICY "UserRoles - super_admin modifications" ON public.user_roles
      FOR ALL
      USING ((auth.jwt() ->> 'role') = 'super_admin')
      WITH CHECK ((auth.jwt() ->> 'role') = 'super_admin');
  END IF;
END$$;

COMMIT;
