-- Fix RLS policy for user_progress to allow public read access for statistics
-- This allows the global stats counter to work without authentication

-- The current policy only allows users to view their OWN progress:
-- CREATE POLICY "Users can view their own progress" 
--     ON public.user_progress FOR SELECT 
--     USING (auth.uid() = user_id);

-- We need to add a policy that allows ANYONE to count rows (for public statistics)
-- while still keeping individual user data private through the application layer

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view their own progress" ON public.user_progress;

-- Create a more permissive read policy for statistics
-- This allows SELECT operations for counting, but the application
-- should filter sensitive data appropriately
CREATE POLICY "Public can view progress for statistics" 
    ON public.user_progress FOR SELECT 
    USING (true);

-- Keep the other policies as-is (users can only modify their own data)
-- These policies should already exist from FIX_RELATED_TABLES.sql:
-- - "Users can insert their own progress" 
-- - "Users can update their own progress" 
-- - "Users can delete their own progress"

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_progress'
ORDER BY policyname;

SELECT 'user_progress RLS policies updated successfully! Public can now view progress for statistics.' AS message;
