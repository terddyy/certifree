-- Step 1: List all tables that contain 'review' in the name
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name LIKE '%review%'
ORDER BY table_name;

-- Step 2: If certification_reviews exists, get its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'certification_reviews'
ORDER BY ordinal_position;

-- Step 3: Try to select from the table (if it exists)
SELECT * FROM certification_reviews LIMIT 1;

-- Step 4: Check if there's a 'reviews' table instead
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'reviews'
ORDER BY ordinal_position;

-- Step 5: List ALL tables in public schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
