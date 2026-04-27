import type { Database } from "@/integrations/supabase/types";

export type CompanyRow = Database["public"]["Tables"]["company"]["Row"];

export type ShortJson = {
  name: string;
  short_name?: string;
  logo_url?: string;
  category?: string;
  employee_size?: string;
  focus_sectors?: string[];
  hiring_velocity?: string;
  profitability_status?: string;
  remote_policy_details?: string;
  yoy_growth_rate?: number;
  brand_value?: string;
  website_url?: string;
  domain?: string;
  headquarters_address?: string;
  operating_countries?: string[];
  city?: string;
  country?: string;
  location?: string;
  employee_count?: number;
};

/** Lightweight projection used by lists/cards — typed against the schema. */
export type CompanyListItem = {
  id: string;
} & ShortJson;

export const LIST_COLUMNS = "company_id,short_json";
