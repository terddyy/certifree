-- ============================================================================
-- QUICK FAVORITES DIAGNOSTIC SCRIPT
-- ============================================================================
-- Run this to check if favorites exist and if the schema is correct
-- ============================================================================

-- 1. Check if user_favorites table exists
SELECT 
    'Table Check' AS test,
    EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'user_favorites'
    ) AS table_exists;

-- 2. Check column types
SELECT 
    'Column Types' AS test,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'user_favorites'
ORDER BY ordinal_position;

-- 3. Check if there are ANY favorites in the database
SELECT 
    'Favorites Count' AS test,
    COUNT(*) AS total_favorites
FROM user_favorites;

-- 4. Show all favorites (if any)
SELECT 
    'All Favorites' AS test,
    user_id,
    certification_id,
    created_at
FROM user_favorites
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check if foreign key relationships exist
SELECT 
    'Foreign Keys' AS test,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table,
    ccu.column_name AS foreign_column
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'user_favorites';

-- 6. Check if certifications table has matching IDs
SELECT 
    'Sample Certifications' AS test,
    id,
    title,
    provider
FROM certifications
LIMIT 5;

-- 7. Try a JOIN to see if it works
SELECT 
    'Test Join' AS test,
    uf.user_id,
    uf.certification_id,
    c.title,
    c.provider
FROM user_favorites uf
LEFT JOIN certifications c ON c.id = uf.certification_id
LIMIT 5;

-- 8. Check RLS status
SELECT 
    'RLS Status' AS test,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename = 'user_favorites';

-- 9. Check RLS policies
SELECT 
    'RLS Policies' AS test,
    policyname,
    cmd AS command,
    qual AS using_clause
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'user_favorites';

-- ============================================================================
-- DIAGNOSTIC SUMMARY
-- ============================================================================
DO $$
DECLARE
    fav_count INTEGER;
    cert_count INTEGER;
    fk_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO fav_count FROM user_favorites;
    SELECT COUNT(*) INTO cert_count FROM certifications;
    SELECT COUNT(*) INTO fk_count 
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name = 'user_favorites';
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FAVORITES DIAGNOSTIC SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Favorites in DB:     %', fav_count;
    RAISE NOTICE 'Certifications:      %', cert_count;
    RAISE NOTICE 'Foreign Keys:        %', fk_count;
    RAISE NOTICE '========================================';
    
    IF fav_count = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  NO FAVORITES FOUND!';
        RAISE NOTICE 'This could mean:';
        RAISE NOTICE '1. You havent added any favorites yet';
        RAISE NOTICE '2. Favorites were deleted when tables were recreated';
        RAISE NOTICE '3. There was an error adding favorites';
        RAISE NOTICE '';
        RAISE NOTICE 'Try adding a favorite from the UI and check console';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '✓ Favorites exist in database';
        RAISE NOTICE 'If UI shows empty, check:';
        RAISE NOTICE '1. Browser console for errors';
        RAISE NOTICE '2. User ID matches (auth.uid())';
        RAISE NOTICE '3. RLS policies are correct';
    END IF;
    
    IF fk_count < 2 THEN
        RAISE WARNING 'Missing foreign keys! Run COMPLETE_DATABASE_FIX.sql';
    ELSE
        RAISE NOTICE '✓ Foreign keys exist';
    END IF;
END $$;
