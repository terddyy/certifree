-- Fix RLS policies for certifications table
-- Allow public viewing without authentication

-- Drop ALL existing policies (including the new ones if they exist)
DROP POLICY IF EXISTS "Certifications are viewable by everyone" ON public.certifications;
DROP POLICY IF EXISTS "Public read access for certifications" ON public.certifications;
DROP POLICY IF EXISTS "Authenticated users can insert certifications" ON public.certifications;
DROP POLICY IF EXISTS "Admins can insert certifications" ON public.certifications;
DROP POLICY IF EXISTS "Admins can update certifications" ON public.certifications;
DROP POLICY IF EXISTS "Admins or Super Admins can insert certifications" ON public.certifications;
DROP POLICY IF EXISTS "Admins or Super Admins can update certifications" ON public.certifications;
DROP POLICY IF EXISTS "Admins or Super Admins can delete certifications" ON public.certifications;
DROP POLICY IF EXISTS "Super admins can delete certifications" ON public.certifications;

-- Public can view certifications (no authentication required)
CREATE POLICY "Public read access for certifications" 
    ON public.certifications FOR SELECT 
    USING (true);

-- Authenticated users can insert certifications (for testing)
-- In production, you'd want to restrict this to admins only
CREATE POLICY "Authenticated users can insert certifications" 
    ON public.certifications FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- Admins and Super Admins can insert certifications
CREATE POLICY "Admins can insert certifications" 
    ON public.certifications FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND (is_admin = true OR is_super_admin = true)
        )
    );

-- Admins and Super Admins can update certifications
CREATE POLICY "Admins can update certifications" 
    ON public.certifications FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND (is_admin = true OR is_super_admin = true)
        )
    );

-- Only Super Admins can delete certifications
CREATE POLICY "Super admins can delete certifications" 
    ON public.certifications FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND is_super_admin = true
        )
    );

-- Check if UUID extension exists (needed for user_progress id generation)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Success message
SELECT 'RLS policies updated successfully!' AS message;
