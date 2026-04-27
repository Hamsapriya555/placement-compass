
-- Enrich company_data with city, country and employee_count
-- Run this in the Supabase SQL Editor

WITH enriched_data AS (
  SELECT 
    company_id,
    -- Extract city and country from headquarters_address
    -- Assumes format "City, Country" or "World HQ: City, Country; ..."
    TRIM(REGEXP_REPLACE(split_part(split_part(headquarters_address, ';', 1), ',', 1), '.*:\s*', '')) as city,
    TRIM(split_part(split_part(headquarters_address, ';', 1), ',', 2)) as country,
    -- Extract first numeric block from employee_size string
    SUBSTRING(employee_size FROM '[0-9]+') as emp_count_str
  FROM public.companies
)
UPDATE public.company_json cj
SET 
  short_json = cj.short_json || jsonb_build_object(
    'city', ed.city,
    'country', ed.country,
    'employee_count', CASE WHEN ed.emp_count_str IS NOT NULL THEN ed.emp_count_str::bigint ELSE null END,
    'location', CASE WHEN ed.city <> '' AND ed.country <> '' THEN ed.city || ', ' || ed.country ELSE COALESCE(ed.country, ed.city) END
  ),
  full_json = cj.full_json || jsonb_build_object(
    'city', ed.city,
    'country', ed.country,
    'employee_count', CASE WHEN ed.emp_count_str IS NOT NULL THEN ed.emp_count_str::bigint ELSE null END,
    'location', CASE WHEN ed.city <> '' AND ed.country <> '' THEN ed.city || ', ' || ed.country ELSE COALESCE(ed.country, ed.city) END
  )
FROM enriched_data ed
WHERE cj.company_id = ed.company_id;
