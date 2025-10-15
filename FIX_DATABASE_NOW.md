# Fix Your Certifications Table - Step by Step

## The Problem
Your certifications table currently has `id uuid` but your data uses text slugs like `'google-cloud-digital-leader'`.

## The Fix (Run in Supabase SQL Editor)

### Step 1: Backup any existing data (if you have any)
```sql
-- Check if you have data
SELECT COUNT(*) FROM public.certifications;
-- You have 2 test certifications that will be deleted and replaced

-- Your current data uses UUIDs:
-- - "b27ab893-1958-49cc-a5aa-ddeb84916489" (tests)
-- - "fb3bf371-f9eb-4ba9-8c87-01c308c171c1" (terd cert)

-- After migration, you'll have proper certifications with slug IDs:
-- - "google-cloud-digital-leader"
-- - "aws-cloud-practitioner"
-- - etc.
```

### Step 2: Drop and recreate the certifications table
```sql
-- Drop the table (this will cascade and remove related data)
DROP TABLE IF EXISTS public.certifications CASCADE;

-- Create the new table with TEXT id
CREATE TABLE public.certifications (
    id text PRIMARY KEY,  -- Changed from UUID to TEXT for slug-based IDs
    title text NOT NULL,
    provider text NOT NULL,
    category text NOT NULL,
    difficulty text NOT NULL,
    duration text NOT NULL,
    rating numeric(3,2) DEFAULT 0,
    total_reviews integer DEFAULT 0,
    description text,
    skills text[] DEFAULT '{}',
    prerequisites text[] DEFAULT '{}',
    image_url text,
    external_url text NOT NULL,
    is_free boolean DEFAULT true,
    certification_type text DEFAULT 'Course',
    career_impact integer DEFAULT 5,
    completion_count integer DEFAULT 0,
    tags text[] DEFAULT '{}',
    last_updated timestamp with time zone DEFAULT now(),
    admin_id uuid REFERENCES public.profiles(id),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX idx_certifications_category ON public.certifications(category);
CREATE INDEX idx_certifications_provider ON public.certifications(provider);
CREATE INDEX idx_certifications_difficulty ON public.certifications(difficulty);
CREATE INDEX idx_certifications_rating ON public.certifications(rating DESC);

-- Enable RLS
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

-- Everyone can view
CREATE POLICY "Certifications are viewable by everyone" 
    ON public.certifications FOR SELECT 
    USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert certifications" 
    ON public.certifications FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND (is_admin = true OR is_super_admin = true)
        )
    );

-- Only admins can update
CREATE POLICY "Admins can update certifications" 
    ON public.certifications FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND (is_admin = true OR is_super_admin = true)
        )
    );

-- Only super admins can delete
CREATE POLICY "Super admins can delete certifications" 
    ON public.certifications FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND is_super_admin = true
        )
    );
```

### Step 3: Insert your certification data
```sql
INSERT INTO public.certifications (
    id, title, provider, category, difficulty, duration, rating, total_reviews, description,
    skills, prerequisites, image_url, external_url, is_free, certification_type, career_impact,
    completion_count, tags, last_updated
) VALUES
('google-cloud-digital-leader', 'Google Cloud Digital Leader', 'Google', 'Cloud Computing', 'Beginner', '40-50 hours', 4.8, 1247, 'Learn cloud computing fundamentals and Google Cloud Platform basics. Perfect for business leaders and technical professionals starting their cloud journey.',
ARRAY['Cloud Fundamentals', 'GCP Basics', 'Digital Transformation', 'Cloud Economics'], ARRAY['Basic computer literacy', 'Business understanding'], '/api/placeholder/400/240', 'https://cloud.google.com/certification/cloud-digital-leader', TRUE, 'Course', 8,
15420, ARRAY['Google', 'Cloud', 'Leadership', 'Beginner-friendly'], '2024-01-15T00:00:00Z'),

('aws-cloud-practitioner', 'AWS Cloud Practitioner', 'Amazon', 'Cloud Computing', 'Beginner', '30-40 hours', 4.7, 2103, 'Foundation-level understanding of AWS Cloud, services, and terminology. Ideal for individuals in technical, managerial, sales, purchasing, or financial roles.',
ARRAY['AWS Fundamentals', 'Cloud Architecture', 'Security Basics', 'Pricing Models'], ARRAY['6 months general AWS Cloud experience'], '/api/placeholder/400/240', 'https://aws.amazon.com/certification/certified-cloud-practitioner/', TRUE, 'Exam', 9,
28650, ARRAY['AWS', 'Cloud', 'Foundation', 'Popular'], '2024-02-01T00:00:00Z'),

('microsoft-az-900', 'Microsoft Azure Fundamentals', 'Microsoft', 'Cloud Computing', 'Beginner', '25-35 hours', 4.6, 1876, 'Foundational knowledge of cloud services and how those services are provided with Microsoft Azure. Perfect for business and technical audiences.',
ARRAY['Azure Services', 'Cloud Concepts', 'Azure Pricing', 'Support'], ARRAY['General technology background'], '/api/placeholder/400/240', 'https://docs.microsoft.com/learn/certifications/azure-fundamentals/', TRUE, 'Course', 8,
19830, ARRAY['Microsoft', 'Azure', 'Cloud', 'Fundamentals'], '2024-01-28T00:00:00Z'),

('google-data-analytics', 'Google Data Analytics Professional Certificate', 'Google', 'Data Science', 'Beginner', '120-180 hours', 4.9, 3425, 'Learn in-demand skills like data cleaning, analysis, and visualization. Get job-ready for an entry-level data analyst role in under 6 months.',
ARRAY['Data Analysis', 'R Programming', 'Tableau', 'SQL', 'Data Visualization'], ARRAY['No prior experience required'], '/api/placeholder/400/240', 'https://www.coursera.org/professional-certificates/google-data-analytics', TRUE, 'Project', 9,
42100, ARRAY['Google', 'Data', 'Analytics', 'Career-change'], '2024-02-05T00:00:00Z'),

('freecodecamp-web-development', 'Responsive Web Design', 'FreeCodeCamp', 'Software Development', 'Beginner', '300 hours', 4.8, 5628, 'Learn HTML and CSS by building projects. Create responsive websites that work on any device. Completely free with hands-on projects.',
ARRAY['HTML5', 'CSS3', 'Responsive Design', 'Flexbox', 'CSS Grid'], ARRAY['Basic computer literacy'], '/api/placeholder/400/240', 'https://www.freecodecamp.org/learn/responsive-web-design/', TRUE, 'Project', 8,
67890, ARRAY['FreeCodeCamp', 'Web Development', 'HTML', 'CSS', 'Beginner'], '2024-01-20T00:00:00Z'),

('cisco-cybersecurity', 'Cisco Cybersecurity Essentials', 'Cisco', 'Cybersecurity', 'Intermediate', '70-90 hours', 4.5, 892, 'Foundational cybersecurity knowledge including risk management, incident response, digital forensics, and business continuity.',
ARRAY['Risk Assessment', 'Incident Response', 'Digital Forensics', 'Security Policies'], ARRAY['Basic networking knowledge', 'CCNA Introduction to Networks recommended'], '/api/placeholder/400/240', 'https://www.netacad.com/courses/cybersecurity/cybersecurity-essentials', TRUE, 'Course', 9,
8934, ARRAY['Cisco', 'Cybersecurity', 'Security', 'Networking'], '2024-01-10T00:00:00Z'),

('comptia-security-plus', 'CompTIA Security+ Study Guide', 'CompTIA', 'Cybersecurity', 'Intermediate', '80-120 hours', 4.7, 1234, 'Industry-standard cybersecurity certification covering threats, attacks, vulnerabilities, architecture, and more.',
ARRAY['Network Security', 'Compliance', 'Threats & Vulnerabilities', 'Identity Management'], ARRAY['2 years IT administration experience', 'Network+ recommended'], '/api/placeholder/400/240', 'https://www.comptia.org/certifications/security', TRUE, 'Exam', 10,
12567, ARRAY['CompTIA', 'Security', 'Industry Standard', 'Popular'], '2024-02-08T00:00:00Z'),

('google-project-management', 'Google Project Management Professional Certificate', 'Google', 'Project Management', 'Beginner', '90-120 hours', 4.8, 2876, 'Launch a career in project management. Learn in-demand skills including Agile, Scrum, and traditional project management approaches.',
ARRAY['Project Planning', 'Agile Management', 'Scrum', 'Risk Management', 'Stakeholder Management'], ARRAY['No prior experience required'], '/api/placeholder/400/240', 'https://www.coursera.org/professional-certificates/google-project-management', TRUE, 'Project', 9,
34567, ARRAY['Google', 'Project Management', 'Agile', 'Career-change'], '2024-01-30T00:00:00Z');
```

### Step 4: Verify it worked
```sql
-- Should show text IDs like 'google-cloud-digital-leader'
SELECT id, title, provider FROM public.certifications LIMIT 5;

-- Check the id type
SELECT data_type FROM information_schema.columns 
WHERE table_name = 'certifications' AND column_name = 'id';
-- Should return: "text"
```

## After Running the SQL

1. Refresh your browser at `http://localhost:8080/certifications`
2. Click on any certification
3. The URL should be like `/certifications/google-cloud-digital-leader`
4. The page should load without errors

## Why This Works

- **Before**: `id uuid` → Required format like `123e4567-e89b-12d3-a456-426614174000`
- **After**: `id text` → Allows any string like `google-cloud-digital-leader`
- **Benefit**: SEO-friendly URLs, human-readable, stable links

Your code doesn't need any changes - it already expects string IDs!
