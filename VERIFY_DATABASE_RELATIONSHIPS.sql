-- ============================================================================
-- DATABASE VERIFICATION SCRIPT
-- ============================================================================
-- Run this script AFTER running COMPLETE_DATABASE_FIX.sql
-- This will verify that all foreign key relationships are properly set up
-- ============================================================================

-- STEP 1: Check if all required tables exist
-- ============================================================================
DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'certifications') THEN
        missing_tables := array_append(missing_tables, 'certifications');
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_favorites') THEN
        missing_tables := array_append(missing_tables, 'user_favorites');
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_progress') THEN
        missing_tables := array_append(missing_tables, 'user_progress');
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reviews') THEN
        missing_tables := array_append(missing_tables, 'reviews');
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quiz_attempts') THEN
        missing_tables := array_append(missing_tables, 'quiz_attempts');
    END IF;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Missing tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE '✓ All required tables exist';
    END IF;
END $$;

-- STEP 2: Verify foreign key relationships
-- ============================================================================
SELECT 
    '✓ Foreign Key Relationships' AS check_name,
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('user_favorites', 'user_progress', 'reviews', 'quiz_attempts')
ORDER BY tc.table_name, kcu.column_name;

-- STEP 3: Verify column data types match
-- ============================================================================
WITH cert_id_type AS (
    SELECT data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
        AND table_name = 'certifications' 
        AND column_name = 'id'
)
SELECT 
    '✓ Column Type Consistency' AS check_name,
    c.table_name,
    c.column_name,
    c.data_type,
    CASE 
        WHEN c.data_type = (SELECT data_type FROM cert_id_type) THEN '✓ MATCH'
        ELSE '✗ MISMATCH'
    END AS status
FROM information_schema.columns c
WHERE c.table_schema = 'public'
    AND c.column_name = 'certification_id'
    AND c.table_name IN ('user_favorites', 'user_progress', 'reviews', 'quiz_attempts')
ORDER BY c.table_name;

-- STEP 4: Check RLS is enabled
-- ============================================================================
SELECT 
    '✓ Row Level Security (RLS) Status' AS check_name,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('user_favorites', 'user_progress', 'reviews', 'quiz_attempts', 'certifications')
ORDER BY tablename;

-- STEP 5: Check RLS Policies exist
-- ============================================================================
SELECT 
    '✓ RLS Policies' AS check_name,
    schemaname,
    tablename,
    policyname,
    cmd AS command_type,
    qual AS using_expression,
    with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('user_favorites', 'user_progress', 'reviews', 'quiz_attempts')
ORDER BY tablename, policyname;

-- STEP 6: Verify indexes exist
-- ============================================================================
SELECT 
    '✓ Indexes for Performance' AS check_name,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('user_favorites', 'user_progress', 'reviews', 'quiz_attempts')
ORDER BY tablename, indexname;

-- STEP 7: Check triggers
-- ============================================================================
SELECT 
    '✓ Database Triggers' AS check_name,
    trigger_schema,
    event_object_table AS table_name,
    trigger_name,
    event_manipulation AS event,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
    AND event_object_table IN ('reviews', 'user_progress', 'certifications')
ORDER BY event_object_table, trigger_name;

-- STEP 8: Test foreign key constraint (optional - only run if you have test data)
-- ============================================================================
-- Uncomment this section if you want to test the foreign key constraint

/*
DO $$
BEGIN
    -- Try to insert a favorite with a non-existent certification_id
    -- This should fail due to foreign key constraint
    BEGIN
        INSERT INTO user_favorites (user_id, certification_id)
        VALUES (
            (SELECT id FROM profiles LIMIT 1),
            'non-existent-certification-id'
        );
        
        RAISE EXCEPTION 'Foreign key constraint NOT working! Invalid data was inserted.';
    EXCEPTION
        WHEN foreign_key_violation THEN
            RAISE NOTICE '✓ Foreign key constraint is working correctly';
            -- Expected error, constraint is working
    END;
END $$;
*/

-- STEP 9: Summary Report
-- ============================================================================
DO $$
DECLARE
    fk_count INTEGER;
    policy_count INTEGER;
    index_count INTEGER;
BEGIN
    -- Count foreign keys
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
        AND table_schema = 'public'
        AND table_name IN ('user_favorites', 'user_progress', 'reviews', 'quiz_attempts');
    
    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
        AND tablename IN ('user_favorites', 'user_progress', 'reviews', 'quiz_attempts');
    
    -- Count indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
        AND tablename IN ('user_favorites', 'user_progress', 'reviews', 'quiz_attempts');
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DATABASE VERIFICATION SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Foreign Keys:    % relationships', fk_count;
    RAISE NOTICE 'RLS Policies:    % policies', policy_count;
    RAISE NOTICE 'Indexes:         % indexes', index_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    IF fk_count >= 8 AND policy_count >= 12 AND index_count >= 12 THEN
        RAISE NOTICE '✓ ✓ ✓ ALL CHECKS PASSED! ✓ ✓ ✓';
        RAISE NOTICE '';
        RAISE NOTICE 'Your database schema is properly configured!';
        RAISE NOTICE 'Foreign key relationships are established.';
        RAISE NOTICE 'Supabase should now be able to perform automatic joins.';
        RAISE NOTICE '';
        RAISE NOTICE 'Next steps:';
        RAISE NOTICE '1. Clear Supabase schema cache (wait 1-2 minutes or refresh in dashboard)';
        RAISE NOTICE '2. Clear browser cache and hard refresh your app';
        RAISE NOTICE '3. Test the favorites functionality';
    ELSE
        RAISE WARNING 'Some checks did not meet expected values. Review the results above.';
    END IF;
END $$;

-- STEP 10: Quick test query (if you have data)
-- ============================================================================
-- This query tests if the join works properly
-- Uncomment to run after you have some data

/*
SELECT 
    'Test Join Query' AS test_name,
    uf.user_id,
    uf.certification_id,
    c.title,
    c.provider
FROM user_favorites uf
LEFT JOIN certifications c ON c.id = uf.certification_id
LIMIT 5;
*/
