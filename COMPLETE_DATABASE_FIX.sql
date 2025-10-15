-- ============================================================================
-- COMPLETE DATABASE FIX - Best Practices Implementation
-- ============================================================================
-- This script fixes the relationship between certifications and related tables
-- using best practices for PostgreSQL and Supabase
-- 
-- Run this script in your Supabase SQL Editor
-- ============================================================================

-- STEP 1: Disable all RLS temporarily to avoid conflicts
ALTER TABLE IF EXISTS public.user_favorites DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.certification_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quiz_attempts DISABLE ROW LEVEL SECURITY;

-- STEP 2: Drop all dependent tables in correct order (CASCADE will handle dependencies)
DROP TABLE IF EXISTS public.user_favorites CASCADE;
DROP TABLE IF EXISTS public.user_progress CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.quiz_attempts CASCADE;

-- Note: certification_reviews is a separate table and may need to be kept
-- Only drop if it needs to be fixed too
-- DROP TABLE IF EXISTS public.certification_reviews CASCADE;

-- STEP 3: Ensure certifications table exists with correct schema
-- If it doesn't exist, this will be handled by create_certifications_table.sql first

-- STEP 4: Create user_favorites table with proper constraints
CREATE TABLE public.user_favorites (
    user_id uuid NOT NULL,
    certification_id text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Primary Key
    CONSTRAINT user_favorites_pkey PRIMARY KEY (user_id, certification_id),
    
    -- Foreign Keys with proper names that Supabase can recognize for auto-joins
    -- Using descriptive names that match TypeScript expectations
    CONSTRAINT fk_user_favorites_user 
        FOREIGN KEY (user_id) 
        REFERENCES public.profiles(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_user_favorites_certification 
        FOREIGN KEY (certification_id) 
        REFERENCES public.certifications(id) 
        ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id 
    ON public.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_certification_id 
    ON public.user_favorites(certification_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_created_at 
    ON public.user_favorites(created_at DESC);

-- Add table comment
COMMENT ON TABLE public.user_favorites IS 'Stores user favorite certifications';

-- STEP 5: Create user_progress table with proper constraints
CREATE TABLE public.user_progress (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    certification_id text NOT NULL,
    status text NOT NULL DEFAULT 'not_started',
    progress_percentage integer NOT NULL DEFAULT 0,
    started_at timestamp with time zone NOT NULL DEFAULT now(),
    completed_at timestamp with time zone,
    last_accessed_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Primary Key
    CONSTRAINT user_progress_pkey PRIMARY KEY (id),
    
    -- Unique constraint to prevent duplicate progress records
    CONSTRAINT user_progress_user_cert_unique 
        UNIQUE (user_id, certification_id),
    
    -- Foreign Keys with descriptive names
    CONSTRAINT fk_user_progress_user 
        FOREIGN KEY (user_id) 
        REFERENCES public.profiles(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_user_progress_certification 
        FOREIGN KEY (certification_id) 
        REFERENCES public.certifications(id) 
        ON DELETE CASCADE,
    
    -- Check constraints for data validation
    CONSTRAINT user_progress_status_check 
        CHECK (status IN ('not_started', 'in_progress', 'completed')),
    
    CONSTRAINT user_progress_progress_percentage_check 
        CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id 
    ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_certification_id 
    ON public.user_progress(certification_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_status 
    ON public.user_progress(status);
CREATE INDEX IF NOT EXISTS idx_user_progress_last_accessed 
    ON public.user_progress(last_accessed_at DESC);

-- Add table comment
COMMENT ON TABLE public.user_progress IS 'Tracks user progress for certifications';

-- STEP 6: Create reviews table (if you're using a separate reviews table)
CREATE TABLE public.reviews (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    certification_id text NOT NULL,
    rating integer NOT NULL,
    content text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Primary Key
    CONSTRAINT reviews_pkey PRIMARY KEY (id),
    
    -- Unique constraint - one review per user per certification
    CONSTRAINT reviews_user_cert_unique 
        UNIQUE (user_id, certification_id),
    
    -- Foreign Keys with descriptive names
    CONSTRAINT fk_reviews_user 
        FOREIGN KEY (user_id) 
        REFERENCES public.profiles(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_reviews_certification 
        FOREIGN KEY (certification_id) 
        REFERENCES public.certifications(id) 
        ON DELETE CASCADE,
    
    -- Check constraint for rating
    CONSTRAINT reviews_rating_check 
        CHECK (rating >= 1 AND rating <= 5)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reviews_certification_id 
    ON public.reviews(certification_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id 
    ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating 
    ON public.reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at 
    ON public.reviews(created_at DESC);

-- Add table comment
COMMENT ON TABLE public.reviews IS 'User reviews for certifications';

-- STEP 7: Update quiz_attempts table to use TEXT certification_id
CREATE TABLE public.quiz_attempts (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    certification_id text NOT NULL,
    total_questions integer NOT NULL,
    correct_answers integer NOT NULL,
    score_percentage integer NOT NULL,
    time_taken_minutes integer,
    answers jsonb NOT NULL DEFAULT '{}'::jsonb,
    started_at timestamp with time zone NOT NULL DEFAULT now(),
    completed_at timestamp with time zone,
    
    -- Primary Key
    CONSTRAINT quiz_attempts_pkey PRIMARY KEY (id),
    
    -- Foreign Keys with descriptive names
    CONSTRAINT fk_quiz_attempts_user 
        FOREIGN KEY (user_id) 
        REFERENCES public.profiles(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_quiz_attempts_certification 
        FOREIGN KEY (certification_id) 
        REFERENCES public.certifications(id) 
        ON DELETE CASCADE,
    
    -- Check constraints
    CONSTRAINT quiz_attempts_total_questions_check 
        CHECK (total_questions > 0),
    
    CONSTRAINT quiz_attempts_correct_answers_check 
        CHECK (correct_answers >= 0 AND correct_answers <= total_questions),
    
    CONSTRAINT quiz_attempts_score_percentage_check 
        CHECK (score_percentage >= 0 AND score_percentage <= 100)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id 
    ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_certification_id 
    ON public.quiz_attempts(certification_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_completed_at 
    ON public.quiz_attempts(completed_at DESC);

-- Add table comment
COMMENT ON TABLE public.quiz_attempts IS 'Records of user quiz attempts for certifications';

-- ============================================================================
-- STEP 8: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 9: CREATE RLS POLICIES FOR user_favorites
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own favorites" ON public.user_favorites;
DROP POLICY IF EXISTS "Users can add their own favorites" ON public.user_favorites;
DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.user_favorites;

-- Create new policies
CREATE POLICY "Users can view their own favorites" 
    ON public.user_favorites 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorites" 
    ON public.user_favorites 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" 
    ON public.user_favorites 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 10: CREATE RLS POLICIES FOR user_progress
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can insert their own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can delete their own progress" ON public.user_progress;

CREATE POLICY "Users can view their own progress" 
    ON public.user_progress 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" 
    ON public.user_progress 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" 
    ON public.user_progress 
    FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress" 
    ON public.user_progress 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 11: CREATE RLS POLICIES FOR reviews
-- ============================================================================

DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
DROP POLICY IF EXISTS "Users can insert their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.reviews;

CREATE POLICY "Reviews are viewable by everyone" 
    ON public.reviews 
    FOR SELECT 
    USING (true);

CREATE POLICY "Users can insert their own reviews" 
    ON public.reviews 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" 
    ON public.reviews 
    FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" 
    ON public.reviews 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 12: CREATE RLS POLICIES FOR quiz_attempts
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can insert their own quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can update their own quiz attempts" ON public.quiz_attempts;

CREATE POLICY "Users can view their own quiz attempts" 
    ON public.quiz_attempts 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz attempts" 
    ON public.quiz_attempts 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quiz attempts" 
    ON public.quiz_attempts 
    FOR UPDATE 
    USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 13: CREATE HELPER FUNCTIONS (Best Practices)
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to reviews table
DROP TRIGGER IF EXISTS update_reviews_updated_at ON public.reviews;
CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to safely increment review count on certifications
CREATE OR REPLACE FUNCTION public.increment_certification_review_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.certifications 
    SET total_reviews = total_reviews + 1
    WHERE id = NEW.certification_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for review count
DROP TRIGGER IF EXISTS increment_review_count ON public.reviews;
CREATE TRIGGER increment_review_count
    AFTER INSERT ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_certification_review_count();

-- Function to decrement review count when deleted
CREATE OR REPLACE FUNCTION public.decrement_certification_review_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.certifications 
    SET total_reviews = GREATEST(0, total_reviews - 1)
    WHERE id = OLD.certification_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for review deletion
DROP TRIGGER IF EXISTS decrement_review_count ON public.reviews;
CREATE TRIGGER decrement_review_count
    AFTER DELETE ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.decrement_certification_review_count();

-- ============================================================================
-- STEP 14: GRANT PERMISSIONS (Best Practice for Supabase)
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Grant table permissions
GRANT ALL ON public.user_favorites TO postgres, service_role;
GRANT SELECT, INSERT, DELETE ON public.user_favorites TO authenticated;

GRANT ALL ON public.user_progress TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_progress TO authenticated;

GRANT ALL ON public.reviews TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;

GRANT ALL ON public.quiz_attempts TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.quiz_attempts TO authenticated;

-- ============================================================================
-- STEP 15: VERIFY SCHEMA
-- ============================================================================

-- Check that all foreign keys are properly created
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name IN ('user_favorites', 'user_progress', 'reviews', 'quiz_attempts')
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$ 
BEGIN 
    RAISE NOTICE '✓ Database schema updated successfully!';
    RAISE NOTICE '✓ All tables now use TEXT for certification_id';
    RAISE NOTICE '✓ Foreign key relationships established';
    RAISE NOTICE '✓ RLS policies configured';
    RAISE NOTICE '✓ Indexes created for performance';
    RAISE NOTICE '✓ Triggers and functions set up';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Verify the foreign key relationships above';
    RAISE NOTICE '2. Test your application with the new schema';
    RAISE NOTICE '3. Clear your browser cache and refresh';
END $$;
