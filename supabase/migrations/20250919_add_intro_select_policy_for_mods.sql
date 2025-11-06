-- Migration: 20250919_add_intro_select_policy_for_mods.sql
-- Purpose: Allow users with roles 'super_admin' or 'content_mod' to SELECT all rows
-- from the `public.intro` table (in addition to approved rows and owner rows).
-- Recommended safe approach: maintain a small `user_roles` table and check it in RLS.
-- Run this migration from the Supabase SQL editor or with a service_role key.

BEGIN;

-- 1) Create a simple mapping table for user roles (idempotent).
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid NOT NULL,
  role    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);

-- 2) Replace the select policy for public.intro so that:
--    - approved rows (is_approved = true) are visible to authenticated users
--    - OR owners (created_by = auth.uid()) can see their own rows
--    - OR users listed in public.user_roles with role IN ('super_admin','content_mod') can see rows
DROP POLICY IF EXISTS select_intro_approved_or_owned ON public.intro;
CREATE POLICY select_intro_approved_or_owned
  ON public.intro
  FOR SELECT
  TO authenticated
  USING (
    is_approved = true
    OR created_by = auth.uid()
    -- Allow access when the JWT role is super_admin (explicit check)
    OR (auth.jwt() ->> 'role') = 'super_admin'
    -- Or when the user is listed in the helper user_roles table as either
    -- a super_admin or a content_mod. Keeping both checks makes the policy
    -- resilient whether you manage roles via JWT or via the user_roles table.
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin', 'content_mod')
    )
  );

COMMIT;

-- Example: add a content moderator to the roles table (run as admin)
-- INSERT INTO public.user_roles (user_id, role) VALUES ('3742404f-9ba7-4db0-81d5-f795fe0d8044', 'content_mod');

-- Rollback note: to restore the original restrictive policy use:
-- DROP POLICY IF EXISTS select_intro_approved_or_owned ON public.intro;
-- CREATE POLICY select_intro_approved_or_owned
--   ON public.intro
--   FOR SELECT
--   TO authenticated
--   USING (is_approved = true OR created_by = auth.uid());
