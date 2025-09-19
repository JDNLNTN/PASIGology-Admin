-- Add is_approved column (default false, required)
ALTER TABLE public.intro
  ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false;

-- Ensure created_by column is UUID type
ALTER TABLE public.intro
  ALTER COLUMN created_by TYPE uuid
  USING created_by::uuid;

-- Enable RLS (if not already enabled)
ALTER TABLE public.intro ENABLE ROW LEVEL SECURITY;

-- Trigger function to set created_by from auth.uid()
CREATE OR REPLACE FUNCTION public.set_created_by()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Always set created_by to the current authenticated user
  NEW.created_by := auth.uid();
  RETURN NEW;
END;
$$;

-- Attach trigger to intro table
DROP TRIGGER IF EXISTS set_created_by_before_insert ON public.intro;
CREATE TRIGGER set_created_by_before_insert
BEFORE INSERT ON public.intro
FOR EACH ROW EXECUTE FUNCTION public.set_created_by();

-- Insert policy: authenticated users can insert rows that they own
DROP POLICY IF EXISTS insert_own_intro ON public.intro;
CREATE POLICY insert_own_intro
  ON public.intro
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Select policy: allow selecting approved rows or rows owned by requester
DROP POLICY IF EXISTS select_intro_approved_or_owned ON public.intro;
CREATE POLICY select_intro_approved_or_owned
  ON public.intro
  FOR SELECT
  TO authenticated
  USING (is_approved = true OR created_by = auth.uid());

-- Update policy: allow owners to update their own rows
DROP POLICY IF EXISTS update_intro_owner ON public.intro;
CREATE POLICY update_intro_owner
  ON public.intro
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Delete policy: allow owners to delete their own rows
DROP POLICY IF EXISTS delete_intro_owner ON public.intro;
CREATE POLICY delete_intro_owner
  ON public.intro
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());