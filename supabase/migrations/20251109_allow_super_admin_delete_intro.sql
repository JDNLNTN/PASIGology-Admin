-- Allow super_admin role to delete rows from public.intro
-- This policy complements the existing owner-only delete policy by
-- permitting users with the JWT claim `role = super_admin` to delete
-- any row in the table.

-- Safety: This migration uses the JWT claims present in the access token.
-- Ensure that the `role` claim is set for your authenticated users (e.g.,
-- included in the user's JWT or added by an auth hook). If you use a
-- different claim name, adjust the logic below.

-- Drop any existing policy with this name to make the migration idempotent.
DROP POLICY IF EXISTS delete_intro_super_admin ON public.intro;

CREATE POLICY delete_intro_super_admin
  ON public.intro
  FOR DELETE
  TO authenticated
  USING (
    -- allow row owner
    created_by = auth.uid()
    -- OR allow users whose JWT `role` claim equals 'super_admin'
    OR (current_setting('jwt.claims', true)::json ->> 'role') = 'super_admin'
  );

-- Note: After applying this migration, authenticated users with the
-- `role` claim set to 'super_admin' in their JWT can delete any row in
-- `public.intro`. If you need a different claim or additional roles,
-- modify the policy accordingly.
