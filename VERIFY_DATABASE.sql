-- Comprehensive database verification and fix script
-- Run this to check and fix all issues

-- 1. Verify certifications table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'certifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Count certifications
SELECT COUNT(*) as total_certifications FROM public.certifications;

-- 3. Check sample certifications
SELECT id, title, provider, category FROM public.certifications LIMIT 3;

-- 4. Verify user_favorites structure
SELECT 
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'user_favorites' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Verify user_progress structure  
SELECT 
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'user_progress' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Check RLS policies on certifications
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'certifications';

-- 7. Test if certifications are publicly readable
-- This should work even without authentication
SELECT id FROM public.certifications LIMIT 1;
