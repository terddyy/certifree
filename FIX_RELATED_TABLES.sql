-- Fix user_favorites and user_progress tables to use TEXT for certification_id
-- This is needed because certifications.id is now TEXT instead of UUID

-- Step 1: Drop and recreate user_favorites with TEXT certification_id
DROP TABLE IF EXISTS public.user_favorites CASCADE;

CREATE TABLE public.user_favorites (
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    certification_id text REFERENCES public.certifications(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (user_id, certification_id)
);

-- Enable RLS
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_favorites
CREATE POLICY "Users can view their own favorites" 
    ON public.user_favorites FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorites" 
    ON public.user_favorites FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" 
    ON public.user_favorites FOR DELETE 
    USING (auth.uid() = user_id);

-- Step 2: Drop and recreate user_progress with TEXT certification_id
DROP TABLE IF EXISTS public.user_progress CASCADE;

CREATE TABLE public.user_progress (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    certification_id text REFERENCES public.certifications(id) ON DELETE CASCADE NOT NULL,
    status text DEFAULT 'not_started' NOT NULL,
    progress_percentage integer DEFAULT 0 NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    last_accessed_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(user_id, certification_id)
);

-- Create index for better performance
CREATE INDEX idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX idx_user_progress_certification_id ON public.user_progress(certification_id);
CREATE INDEX idx_user_progress_status ON public.user_progress(status);

-- Enable RLS
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_progress
CREATE POLICY "Users can view their own progress" 
    ON public.user_progress FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" 
    ON public.user_progress FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" 
    ON public.user_progress FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress" 
    ON public.user_progress FOR DELETE 
    USING (auth.uid() = user_id);

-- Step 3: Fix reviews table if it exists
DROP TABLE IF EXISTS public.reviews CASCADE;

CREATE TABLE public.reviews (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    certification_id text REFERENCES public.certifications(id) ON DELETE CASCADE NOT NULL,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    content text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(user_id, certification_id)
);

-- Create index
CREATE INDEX idx_reviews_certification_id ON public.reviews(certification_id);
CREATE INDEX idx_reviews_user_id ON public.reviews(user_id);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Everyone can view reviews
CREATE POLICY "Reviews are viewable by everyone" 
    ON public.reviews FOR SELECT 
    USING (true);

-- Users can insert their own reviews
CREATE POLICY "Users can insert their own reviews" 
    ON public.reviews FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews" 
    ON public.reviews FOR UPDATE 
    USING (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews" 
    ON public.reviews FOR DELETE 
    USING (auth.uid() = user_id);

-- Success message
SELECT 'All tables updated successfully! certification_id is now TEXT in all related tables.' AS message;
