-- Get structure of 'reviews' table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'reviews'
ORDER BY ordinal_position;

-- Get structure of 'certification_reviews' table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'certification_reviews'
ORDER BY ordinal_position;

-- Get sample data from 'reviews' table
SELECT * FROM reviews LIMIT 3;

-- Get sample data from 'certification_reviews' table
SELECT * FROM certification_reviews LIMIT 3;

-- Count records in each table
SELECT 'reviews' as table_name, COUNT(*) as record_count FROM reviews
UNION ALL
SELECT 'certification_reviews' as table_name, COUNT(*) as record_count FROM certification_reviews;
