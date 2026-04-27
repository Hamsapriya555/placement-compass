-- Final 3 companies missing brand_value

UPDATE public.company_json SET short_json = short_json || '{"brand_value":"Emerging"}'::jsonb, full_json = full_json || '{"brand_value":"Emerging"}'::jsonb WHERE company_id = 85;
UPDATE public.company_json SET short_json = short_json || '{"brand_value":"Emerging"}'::jsonb, full_json = full_json || '{"brand_value":"Emerging"}'::jsonb WHERE company_id = 113;
UPDATE public.company_json SET short_json = short_json || '{"brand_value":"Emerging"}'::jsonb, full_json = full_json || '{"brand_value":"Emerging"}'::jsonb WHERE company_id = 117;
