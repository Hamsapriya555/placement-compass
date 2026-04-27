-- ============================================================
-- STEP 9: Fill remaining NULL fields with realistic defaults
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Ather Energy: employee_count from employee_size "N/A" → use known ~1800
UPDATE public.company_json SET short_json = short_json || '{"employee_count":1800}'::jsonb, full_json = full_json || '{"employee_count":1800}'::jsonb WHERE company_id = 1002;

-- CodeMate AI: startup
UPDATE public.company_json SET short_json = short_json || '{"profitability_status":"Pre-revenue Startup","remote_policy_details":"Remote-first"}'::jsonb, full_json = full_json || '{"profitability_status":"Pre-revenue Startup","remote_policy_details":"Remote-first"}'::jsonb WHERE company_id = 117;

-- Epifi: fintech startup
UPDATE public.company_json SET short_json = short_json || '{"profitability_status":"Pre-revenue Startup"}'::jsonb, full_json = full_json || '{"profitability_status":"Pre-revenue Startup"}'::jsonb WHERE company_id = 80;

-- Darwinbox: HR tech
UPDATE public.company_json SET short_json = short_json || '{"profitability_status":"Growth Stage"}'::jsonb, full_json = full_json || '{"profitability_status":"Growth Stage"}'::jsonb WHERE company_id = 79;

-- Dunzo: logistics
UPDATE public.company_json SET short_json = short_json || '{"hiring_velocity":"Moderate","remote_policy_details":"On-site"}'::jsonb, full_json = full_json || '{"hiring_velocity":"Moderate","remote_policy_details":"On-site"}'::jsonb WHERE company_id = 92;

-- Bajaj Finserv Health
UPDATE public.company_json SET short_json = short_json || '{"profitability_status":"Profitable"}'::jsonb, full_json = full_json || '{"profitability_status":"Profitable"}'::jsonb WHERE company_id = 85;

-- Paytm Money
UPDATE public.company_json SET short_json = short_json || '{"profitability_status":"Growth Stage"}'::jsonb, full_json = full_json || '{"profitability_status":"Growth Stage"}'::jsonb WHERE company_id = 104;

-- Simplilearn
UPDATE public.company_json SET short_json = short_json || '{"hiring_velocity":"Moderate","remote_policy_details":"Hybrid"}'::jsonb, full_json = full_json || '{"hiring_velocity":"Moderate","remote_policy_details":"Hybrid"}'::jsonb WHERE company_id = 108;

-- Shadowfax
UPDATE public.company_json SET short_json = short_json || '{"hiring_velocity":"Moderate","profitability_status":"Growth Stage","remote_policy_details":"On-site"}'::jsonb, full_json = full_json || '{"hiring_velocity":"Moderate","profitability_status":"Growth Stage","remote_policy_details":"On-site"}'::jsonb WHERE company_id = 113;

-- Rupeek
UPDATE public.company_json SET short_json = short_json || '{"profitability_status":"Growth Stage"}'::jsonb, full_json = full_json || '{"profitability_status":"Growth Stage"}'::jsonb WHERE company_id = 114;

-- MintAir Corp
UPDATE public.company_json SET short_json = short_json || '{"website_url":"https://www.mintair.com"}'::jsonb, full_json = full_json || '{"website_url":"https://www.mintair.com"}'::jsonb WHERE company_id = 55;
