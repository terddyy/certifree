-- ============================================================================
-- FIND ORPHANED FAVORITES SCRIPT
-- ============================================================================
-- This script checks for favorites that point to non-existent certifications.
-- ============================================================================

-- STEP 1: Check for the specific missing certification
-- Does a certification with id = 'freecodecamp-web-development' exist?
SELECT 
    'Specific Check' AS test,
    id,
    title
FROM public.certifications
WHERE id = 'freecodecamp-web-development';
-- EXPECTED: 0 rows, which is the problem.

-- STEP 2: List all favorite IDs and see which ones are "orphaned"
-- This query shows which favorites have a matching certification and which don't.
SELECT 
    uf.user_id,
    uf.certification_id AS favorite_certification_id,
    c.id AS certification_table_id,
    CASE 
        WHEN c.id IS NULL THEN '⚠️ ORPHANED - No match in certifications table!'
        ELSE '✅ MATCH FOUND'
    END AS status
FROM public.user_favorites uf
LEFT JOIN public.certifications c ON uf.certification_id = c.id;

-- STEP 3: List some available certification IDs from your table
-- You can use one of these to fix the orphaned favorite.
SELECT 
    'Available Certification IDs' AS reference,
    id,
    title
FROM public.certifications
LIMIT 10;

-- ============================================================================
-- HOW TO FIX IT
-- ============================================================================
-- You have two options:

-- OPTION A: Delete the orphaned favorite record.
-- Best if the favorite was a mistake or for a deleted certification.
/*
DELETE FROM public.user_favorites
WHERE certification_id = 'freecodecamp-web-development';
*/

-- OPTION B: Update the orphaned favorite to point to a REAL certification.
-- Use this if you want to keep the favorite but just fix the link.
-- First, pick a REAL ID from the "Available Certification IDs" list above.
/*
UPDATE public.user_favorites
SET certification_id = 'REPLACE_WITH_A_REAL_ID_FROM_THE_LIST_ABOVE'
WHERE certification_id = 'freecodecamp-web-development';
*/

-- ============================================================================
-- WHY DID THIS HAPPEN?
-- ============================================================================
-- 1. Data Insertion Order: You may have inserted favorites before inserting
--    the corresponding certifications into the `certifications` table.
-- 2. Typos: The ID 'freecodecamp-web-development' in `user_favorites` might
--    have a typo and doesn't match the actual ID in the `certifications` table.
-- 3. Deletion: A certification with that ID might have been deleted, but the
--    corresponding favorite record was not. The `ON DELETE CASCADE` in the
--    new schema fix will prevent this from happening in the future.
-- ============================================================================

SELECT 'Run the queries above to diagnose and choose a fix.' AS next_step;
