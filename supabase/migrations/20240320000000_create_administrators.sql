-- Drop existing triggers and functions if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_user_update();

-- Create administrators table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.administrators (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'banned')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.administrators ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access" ON public.administrators
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert their own profile" ON public.administrators
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow super admins to update any profile" ON public.administrators
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.administrators
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "Allow super admins to delete any profile" ON public.administrators
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.administrators
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
    user_role TEXT;
BEGIN
    -- Extract name from metadata or use email as fallback
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );

    -- Extract role from metadata or use 'admin' as fallback
    user_role := COALESCE(
        NEW.raw_user_meta_data->>'role',
        'admin'
    );

    -- Insert into administrators table
    INSERT INTO public.administrators (
        id,
        email,
        name,
        role,
        status
    ) VALUES (
        NEW.id,
        NEW.email,
        user_name,
        user_role,
        'active'
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error
        RAISE LOG 'Error in handle_new_user: %', SQLERRM;
        -- Re-raise the error
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to handle user updates
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
    user_role TEXT;
BEGIN
    -- Extract name from metadata or use email as fallback
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );

    -- Extract role from metadata or use 'admin' as fallback
    user_role := COALESCE(
        NEW.raw_user_meta_data->>'role',
        'admin'
    );

    -- Update administrators table
    UPDATE public.administrators
    SET
        email = NEW.email,
        name = user_name,
        role = user_role,
        updated_at = NOW()
    WHERE id = NEW.id;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error
        RAISE LOG 'Error in handle_user_update: %', SQLERRM;
        -- Re-raise the error
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user updates
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON public.administrators TO authenticated;
GRANT SELECT ON public.administrators TO anon; 