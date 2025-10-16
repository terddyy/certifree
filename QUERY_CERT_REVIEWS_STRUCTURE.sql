-- Query 2: Get structure of 'certification_reviews' table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'certification_reviews'
ORDER BY ordinal_position;
