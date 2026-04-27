-- ============================================================
-- COMPREHENSIVE DATA ENRICHMENT FOR company_json
-- Run this in the Supabase SQL Editor (bypasses RLS)
-- ============================================================

-- ─── STEP 1: Copy critical fields from full_json → short_json ───
-- These fields exist in full_json but are missing from short_json

UPDATE public.company_json
SET short_json = short_json
  || jsonb_build_object(
    'website_url',           COALESCE(full_json->>'website_url', short_json->>'website_url'),
    'hiring_velocity',       COALESCE(full_json->>'hiring_velocity', short_json->>'hiring_velocity'),
    'profitability_status',  COALESCE(full_json->>'profitability_status', short_json->>'profitability_status'),
    'remote_policy_details', COALESCE(full_json->>'remote_policy_details', short_json->>'remote_policy_details'),
    'brand_value',           COALESCE(full_json->>'brand_value', short_json->>'brand_value')
  )
WHERE full_json IS NOT NULL;

-- ─── STEP 2: Copy focus_sectors from full_json → short_json ───
-- focus_sectors is stored as a string in full_json, copy it as-is

UPDATE public.company_json
SET short_json = short_json || jsonb_build_object('focus_sectors', full_json->'focus_sectors')
WHERE full_json->'focus_sectors' IS NOT NULL
  AND (short_json->'focus_sectors' IS NULL OR short_json->>'focus_sectors' = '' OR short_json->>'focus_sectors' = 'null');

-- ─── STEP 3: Fix companies with bad city/country parsing ───
-- These had full addresses stuffed into 'city' and empty 'country'

-- US companies with full addresses
UPDATE public.company_json SET short_json = short_json || '{"city":"San Francisco","country":"USA","location":"San Francisco, USA"}'::jsonb, full_json = full_json || '{"city":"San Francisco","country":"USA","location":"San Francisco, USA"}'::jsonb WHERE company_id = 127;
UPDATE public.company_json SET short_json = short_json || '{"city":"Bellevue","country":"USA","location":"Bellevue, USA"}'::jsonb, full_json = full_json || '{"city":"Bellevue","country":"USA","location":"Bellevue, USA"}'::jsonb WHERE company_id = 128;
UPDATE public.company_json SET short_json = short_json || '{"city":"Seattle","country":"USA","location":"Seattle, USA"}'::jsonb, full_json = full_json || '{"city":"Seattle","country":"USA","location":"Seattle, USA"}'::jsonb WHERE company_id = 129;
UPDATE public.company_json SET short_json = short_json || '{"city":"Mountain View","country":"USA","location":"Mountain View, USA"}'::jsonb, full_json = full_json || '{"city":"Mountain View","country":"USA","location":"Mountain View, USA"}'::jsonb WHERE company_id = 130;
UPDATE public.company_json SET short_json = short_json || '{"city":"Bengaluru","country":"India","location":"Bengaluru, India"}'::jsonb, full_json = full_json || '{"city":"Bengaluru","country":"India","location":"Bengaluru, India"}'::jsonb WHERE company_id = 131;
UPDATE public.company_json SET short_json = short_json || '{"city":"Noida","country":"India","location":"Noida, India"}'::jsonb, full_json = full_json || '{"city":"Noida","country":"India","location":"Noida, India"}'::jsonb WHERE company_id = 132;
UPDATE public.company_json SET short_json = short_json || '{"city":"Austin","country":"USA","location":"Austin, USA"}'::jsonb, full_json = full_json || '{"city":"Austin","country":"USA","location":"Austin, USA"}'::jsonb WHERE company_id = 133;
UPDATE public.company_json SET short_json = short_json || '{"city":"San Francisco","country":"USA","location":"San Francisco, USA"}'::jsonb, full_json = full_json || '{"city":"San Francisco","country":"USA","location":"San Francisco, USA"}'::jsonb WHERE company_id = 134;
UPDATE public.company_json SET short_json = short_json || '{"city":"Hyderabad","country":"India","location":"Hyderabad, India"}'::jsonb, full_json = full_json || '{"city":"Hyderabad","country":"India","location":"Hyderabad, India"}'::jsonb WHERE company_id = 135;
UPDATE public.company_json SET short_json = short_json || '{"city":"Bengaluru","country":"India","location":"Bengaluru, India"}'::jsonb, full_json = full_json || '{"city":"Bengaluru","country":"India","location":"Bengaluru, India"}'::jsonb WHERE company_id = 136;
UPDATE public.company_json SET short_json = short_json || '{"city":"Stuttgart","country":"Germany","location":"Stuttgart, Germany"}'::jsonb, full_json = full_json || '{"city":"Stuttgart","country":"Germany","location":"Stuttgart, Germany"}'::jsonb WHERE company_id = 137;
UPDATE public.company_json SET short_json = short_json || '{"city":"Ashburn","country":"USA","location":"Ashburn, USA"}'::jsonb, full_json = full_json || '{"city":"Ashburn","country":"USA","location":"Ashburn, USA"}'::jsonb WHERE company_id = 96;
UPDATE public.company_json SET short_json = short_json || '{"city":"Bangalore","country":"India","location":"Bangalore, India"}'::jsonb, full_json = full_json || '{"city":"Bangalore","country":"India","location":"Bangalore, India"}'::jsonb WHERE company_id = 103;
UPDATE public.company_json SET short_json = short_json || '{"city":"Hyderabad","country":"India","location":"Hyderabad, India"}'::jsonb, full_json = full_json || '{"city":"Hyderabad","country":"India","location":"Hyderabad, India"}'::jsonb WHERE company_id = 105;
UPDATE public.company_json SET short_json = short_json || '{"city":"Gurugram","country":"India","location":"Gurugram, India"}'::jsonb, full_json = full_json || '{"city":"Gurugram","country":"India","location":"Gurugram, India"}'::jsonb WHERE company_id = 106;
UPDATE public.company_json SET short_json = short_json || '{"city":"Miami","country":"USA","location":"Miami, USA"}'::jsonb, full_json = full_json || '{"city":"Miami","country":"USA","location":"Miami, USA"}'::jsonb WHERE company_id = 55;

-- Companies with city only, no country (IDs 319-331)
UPDATE public.company_json SET short_json = short_json || '{"country":"Canada","location":"Ottawa, Canada"}'::jsonb, full_json = full_json || '{"country":"Canada","location":"Ottawa, Canada"}'::jsonb WHERE company_id = 319;
UPDATE public.company_json SET short_json = short_json || '{"country":"USA","location":"New York, USA"}'::jsonb, full_json = full_json || '{"country":"USA","location":"New York, USA"}'::jsonb WHERE company_id = 320;
UPDATE public.company_json SET short_json = short_json || '{"country":"USA","location":"Bowie, USA"}'::jsonb, full_json = full_json || '{"country":"USA","location":"Bowie, USA"}'::jsonb WHERE company_id = 321;
UPDATE public.company_json SET short_json = short_json || '{"country":"USA","location":"New York, USA"}'::jsonb, full_json = full_json || '{"country":"USA","location":"New York, USA"}'::jsonb WHERE company_id = 322;
UPDATE public.company_json SET short_json = short_json || '{"country":"USA","location":"Kent, USA"}'::jsonb, full_json = full_json || '{"country":"USA","location":"Kent, USA"}'::jsonb WHERE company_id = 323;
UPDATE public.company_json SET short_json = short_json || '{"country":"UK","location":"London, UK"}'::jsonb, full_json = full_json || '{"country":"UK","location":"London, UK"}'::jsonb WHERE company_id = 324;
UPDATE public.company_json SET short_json = short_json || '{"country":"India","location":"Pune, India"}'::jsonb, full_json = full_json || '{"country":"India","location":"Pune, India"}'::jsonb WHERE company_id = 325;
UPDATE public.company_json SET short_json = short_json || '{"country":"USA","location":"Arlington, USA"}'::jsonb, full_json = full_json || '{"country":"USA","location":"Arlington, USA"}'::jsonb WHERE company_id = 326;
UPDATE public.company_json SET short_json = short_json || '{"country":"Estonia","location":"Tallinn, Estonia"}'::jsonb, full_json = full_json || '{"country":"Estonia","location":"Tallinn, Estonia"}'::jsonb WHERE company_id = 327;
UPDATE public.company_json SET short_json = short_json || '{"country":"USA","location":"Norwalk, USA"}'::jsonb, full_json = full_json || '{"country":"USA","location":"Norwalk, USA"}'::jsonb WHERE company_id = 328;
UPDATE public.company_json SET short_json = short_json || '{"country":"Germany","location":"Stuttgart, Germany"}'::jsonb, full_json = full_json || '{"country":"Germany","location":"Stuttgart, Germany"}'::jsonb WHERE company_id = 329;
UPDATE public.company_json SET short_json = short_json || '{"country":"USA","location":"Redwood City, USA"}'::jsonb, full_json = full_json || '{"city":"Redwood City","country":"USA","location":"Redwood City, USA"}'::jsonb WHERE company_id = 330;
UPDATE public.company_json SET short_json = short_json || '{"country":"USA","location":"Palo Alto, USA"}'::jsonb, full_json = full_json || '{"country":"USA","location":"Palo Alto, USA"}'::jsonb WHERE company_id = 331;

-- ─── STEP 4: Fix remaining companies with complex HQ addresses in city ───
-- Oracle, Google, Apple, Amazon, etc. that had full street addresses

UPDATE public.company_json SET short_json = short_json || '{"city":"Redwood City","country":"USA","location":"Redwood City, USA"}'::jsonb, full_json = full_json || '{"city":"Redwood City","country":"USA","location":"Redwood City, USA"}'::jsonb WHERE company_id IN (SELECT company_id FROM public.companies WHERE name ILIKE '%Oracle%');
UPDATE public.company_json SET short_json = short_json || '{"city":"Mountain View","country":"USA","location":"Mountain View, USA"}'::jsonb, full_json = full_json || '{"city":"Mountain View","country":"USA","location":"Mountain View, USA"}'::jsonb WHERE company_id IN (SELECT company_id FROM public.companies WHERE name ILIKE '%Google%');
UPDATE public.company_json SET short_json = short_json || '{"city":"Cupertino","country":"USA","location":"Cupertino, USA"}'::jsonb, full_json = full_json || '{"city":"Cupertino","country":"USA","location":"Cupertino, USA"}'::jsonb WHERE company_id IN (SELECT company_id FROM public.companies WHERE name ILIKE '%Apple%');
UPDATE public.company_json SET short_json = short_json || '{"city":"Seattle","country":"USA","location":"Seattle, USA"}'::jsonb, full_json = full_json || '{"city":"Seattle","country":"USA","location":"Seattle, USA"}'::jsonb WHERE company_id IN (SELECT company_id FROM public.companies WHERE name ILIKE '%Amazon%');
UPDATE public.company_json SET short_json = short_json || '{"city":"Tokyo","country":"Japan","location":"Tokyo, Japan"}'::jsonb, full_json = full_json || '{"city":"Tokyo","country":"Japan","location":"Tokyo, Japan"}'::jsonb WHERE company_id IN (SELECT company_id FROM public.companies WHERE name ILIKE '%Mitsubishi%');
UPDATE public.company_json SET short_json = short_json || '{"city":"Sydney","country":"Australia","location":"Sydney, Australia"}'::jsonb, full_json = full_json || '{"city":"Sydney","country":"Australia","location":"Sydney, Australia"}'::jsonb WHERE company_id IN (SELECT company_id FROM public.companies WHERE name ILIKE '%Commonwealth%');
UPDATE public.company_json SET short_json = short_json || '{"city":"San Jose","country":"USA","location":"San Jose, USA"}'::jsonb, full_json = full_json || '{"city":"San Jose","country":"USA","location":"San Jose, USA"}'::jsonb WHERE company_id IN (SELECT company_id FROM public.companies WHERE name ILIKE '%Cisco%');

-- ─── STEP 5: Normalize NA/N/A/empty values to null in both JSONs ───

UPDATE public.company_json
SET short_json = (
  SELECT jsonb_object_agg(
    key,
    CASE
      WHEN value::text IN ('"NA"', '"N/A"', '"n/a"', '"Not Found"', '"undefined"', '"null"', '"None"', '""')
      THEN 'null'::jsonb
      ELSE value
    END
  )
  FROM jsonb_each(short_json)
),
full_json = (
  SELECT jsonb_object_agg(
    key,
    CASE
      WHEN value::text IN ('"NA"', '"N/A"', '"n/a"', '"Not Found"', '"undefined"', '"null"', '"None"', '""')
      THEN 'null'::jsonb
      ELSE value
    END
  )
  FROM jsonb_each(full_json)
);

-- ─── STEP 6: Fill location for any remaining rows that have city but no location ───

UPDATE public.company_json
SET short_json = short_json || jsonb_build_object(
  'location',
  CASE
    WHEN short_json->>'city' IS NOT NULL AND short_json->>'country' IS NOT NULL
    THEN (short_json->>'city') || ', ' || (short_json->>'country')
    ELSE COALESCE(short_json->>'country', short_json->>'city')
  END
),
full_json = full_json || jsonb_build_object(
  'location',
  CASE
    WHEN full_json->>'city' IS NOT NULL AND full_json->>'country' IS NOT NULL
    THEN (full_json->>'city') || ', ' || (full_json->>'country')
    ELSE COALESCE(full_json->>'country', full_json->>'city')
  END
)
WHERE short_json->>'location' IS NULL OR short_json->>'location' = '';

-- ─── STEP 7: Fill operating_countries from country if missing ───

UPDATE public.company_json
SET short_json = short_json || jsonb_build_object('operating_countries', short_json->>'country'),
    full_json = full_json || jsonb_build_object('operating_countries', full_json->>'country')
WHERE (short_json->>'operating_countries' IS NULL OR short_json->>'operating_countries' = '')
  AND short_json->>'country' IS NOT NULL;

-- ─── STEP 8: Fill office_locations from headquarters_address if missing ───

UPDATE public.company_json
SET short_json = short_json || jsonb_build_object('office_locations', full_json->>'headquarters_address'),
    full_json = full_json || jsonb_build_object('office_locations', full_json->>'headquarters_address')
WHERE (short_json->>'office_locations' IS NULL OR short_json->>'office_locations' = '')
  AND full_json->>'headquarters_address' IS NOT NULL;
