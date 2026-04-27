import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type CompanyListItem, type CompanyRow, type ShortJson } from "@/lib/company-types";
import { getDomainFromUrl } from "@/lib/logo-utils";

type CompanySource = "company_json" | "company";

let cachedCompanySource: CompanySource | undefined;

async function resolveCompanySource(): Promise<CompanySource> {
  if (cachedCompanySource) return cachedCompanySource;

  const { error } = await supabase.from("company_json").select("company_id").limit(1);
  if (!error) {
    cachedCompanySource = "company_json";
    return cachedCompanySource;
  }

  if (error.code === "PGRST205") {
    cachedCompanySource = "company";
    return cachedCompanySource;
  }

  cachedCompanySource = "company_json";
  return cachedCompanySource;
}

function companyJsonToListItem(item: {
  company_id: string | number;
  short_json: unknown;
  full_json?: unknown;
}): CompanyListItem {
  const shortJson: Partial<ShortJson> =
    item.short_json && typeof item.short_json === "object" ? (item.short_json as ShortJson) : {};
  const fullJson: Record<string, unknown> =
    item.full_json && typeof item.full_json === "object"
      ? (item.full_json as Record<string, unknown>)
      : {};

  const nestedLogoUrl =
    (Array.isArray(fullJson.company_logo) &&
      fullJson.company_logo[0] &&
      typeof fullJson.company_logo[0] === "object" &&
      (fullJson.company_logo[0] as Record<string, unknown>).logo_url) ||
    undefined;

  const logo_url =
    (typeof nestedLogoUrl === "string" && nestedLogoUrl) ||
    (typeof fullJson.logo_url === "string" && fullJson.logo_url) ||
    (typeof shortJson.logo_url === "string" && shortJson.logo_url);

  const website_url =
    (typeof shortJson.website_url === "string" && shortJson.website_url) ||
    (typeof fullJson.website_url === "string" && fullJson.website_url) ||
    undefined;

  const domain =
    (typeof shortJson.domain === "string" && shortJson.domain) ||
    (typeof fullJson.domain === "string" && fullJson.domain) ||
    getDomainFromUrl(website_url) ||
    undefined;

  const city = (shortJson.city as string) || (fullJson.city as string) || undefined;
  const country = (shortJson.country as string) || (fullJson.country as string) || undefined;
  const location = city && country ? `${city}, ${country}` : country || city || undefined;
  const employeeCount = (shortJson.employee_count as number) || (fullJson.employee_count as number) || undefined;

  return {
    id: String(item.company_id),
    name: shortJson.name ?? "Unknown company",
    ...shortJson,
    city,
    country,
    location,
    employee_count: employeeCount,
    logo_url,
    website_url,
    domain,
  };
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeArrayField(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [value];
    } catch {
      return [value];
    }
  }
  return [];
}

function hasUsableValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  const text = String(value).trim().toLowerCase();
  return text !== "" && text !== "n/a" && text !== "na" && text !== "null" && text !== "undefined";
}

function bucketValue(key: string, value: string): string {
  const v = value.toLowerCase();
  
  if (key === 'hiring_velocity') {
    if (v.includes('rapid') || v.includes('high') || v.includes('fast')) return 'High Velocity';
    if (v.includes('moderate') || v.includes('steady')) return 'Moderate';
    if (v.includes('slow') || v.includes('frozen') || v.includes('paused')) return 'Low / Paused';
    if (v.includes('expanding')) return 'Expanding';
    return 'Moderate'; // Default fallback for sentences
  }
  
  if (key === 'remote_policy_details') {
    if (v.includes('remote-first') || v.includes('fully distributed') || v.includes('100% remote')) return 'Remote';
    if (v.includes('hybrid')) return 'Hybrid';
    if (v.includes('on-site') || v.includes('office-centric') || v.includes('in-person')) return 'On-site';
    return 'Hybrid'; // Default fallback
  }

  if (key === 'profitability_status') {
    if (v.includes('highly profitable') || v.includes('consistently profitable')) return 'Highly Profitable';
    if (v.includes('profitable')) return 'Profitable';
    if (v.includes('loss') || v.includes('pre-revenue')) return 'Loss-making';
    if (v.includes('break-even') || v.includes('approaching')) return 'Near Profitable';
    return 'Other';
  }

  return value;
}

function applyListFilters(rows: CompanyListItem[], filters: CompanyListFilters): CompanyListItem[] {
  const q = normalizeString(filters.q);
  const sort = filters.sort ?? "name";
  const direction = (filters.ascending ?? true) ? 1 : -1;

  return rows
    .filter((row) => {
      const focusSectors = normalizeArrayField(row.focus_sectors);
      const matchesSearch =
        !q ||
        normalizeString(row.name).includes(q) ||
        normalizeString(row.short_name).includes(q) ||
        focusSectors.some((sector) => normalizeString(sector).includes(q));

      return (
        matchesSearch &&
        (!filters.category || row.category === filters.category) &&
        (!filters.employeeSize || row.employee_size === filters.employeeSize) &&
        (!filters.profitability || row.profitability_status === filters.profitability) &&
        (!filters.remotePolicy || row.remote_policy_details === filters.remotePolicy) &&
        (!filters.hiringVelocity || row.hiring_velocity === filters.hiringVelocity) &&
        (!filters.focusSector || focusSectors.includes(filters.focusSector))
      );
    })
    .sort((a, b) => {
      const av = a[sort];
      const bv = b[sort];
      if (typeof av === "number" || typeof bv === "number") {
        return (
          (((av as number | undefined) ?? Number.NEGATIVE_INFINITY) -
            ((bv as number | undefined) ?? Number.NEGATIVE_INFINITY)) *
          direction
        );
      }
      return (
        String(av ?? "").localeCompare(String(bv ?? ""), undefined, {
          numeric: true,
          sensitivity: "base",
        }) * direction
      );
    })
    .slice(0, filters.limit ?? rows.length);
}

function companyJsonToCompanyRow(item: { company_id: string; full_json: unknown }): CompanyRow {
  const data = item.full_json as Record<string, unknown>;
  const nestedLogoUrl =
    Array.isArray(data.company_logo) &&
    data.company_logo[0] &&
    typeof data.company_logo[0] === "object"
      ? (data.company_logo[0] as Record<string, unknown>).logo_url
      : undefined;
  const websiteUrl = typeof data.website_url === "string" ? data.website_url : undefined;
  const rawDomain =
    typeof data.domain === "string"
      ? data.domain
      : typeof data.company_domain === "string"
        ? data.company_domain
        : undefined;

  // Parse array fields that might come as strings from JSON
  const parseArrayField = (value: unknown): string[] | null => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string" && value.length > 0) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }
    return null;
  };

  // Parse numeric fields that might come as strings from JSON
  const parseNumberField = (value: unknown): number | null => {
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.length > 0) {
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    }
    return null;
  };

  return {
    id: String(item.company_id),
    ...data,
    logo_url:
      (typeof nestedLogoUrl === "string" && nestedLogoUrl) ||
      (typeof data.logo_url === "string" && data.logo_url) ||
      undefined,
    focus_sectors: parseArrayField(data.focus_sectors) ?? undefined,
    operating_countries: parseArrayField(data.operating_countries) ?? undefined,
    office_locations: parseArrayField(data.office_locations) ?? undefined,
    top_customers: parseArrayField(data.top_customers) ?? undefined,
    key_competitors: parseArrayField(data.key_competitors) ?? undefined,
    key_investors: parseArrayField(data.key_investors) ?? undefined,
    tech_stack: parseArrayField(data.tech_stack) ?? undefined,
    technology_partners: parseArrayField(data.technology_partners) ?? undefined,
    awards_recognitions: parseArrayField(data.awards_recognitions) ?? undefined,
    market_share_percentage: parseNumberField(data.market_share_percentage) ?? undefined,
    yoy_growth_rate: parseNumberField(data.yoy_growth_rate) ?? undefined,
    diversity_inclusion_score: parseNumberField(data.diversity_inclusion_score) ?? undefined,
    runway_months: parseNumberField(data.runway_months) ?? undefined,
    burn_multiplier: parseNumberField(data.burn_multiplier) ?? undefined,
    tech_adoption_rating: parseNumberField(data.tech_adoption_rating) ?? undefined,
    website_rating: parseNumberField(data.website_rating) ?? undefined,
    glassdoor_rating: parseNumberField(data.glassdoor_rating) ?? undefined,
    indeed_rating: parseNumberField(data.indeed_rating) ?? undefined,
    google_rating: parseNumberField(data.google_rating) ?? undefined,
    brand_sentiment_score: parseNumberField(data.brand_sentiment_score) ?? undefined,
    website_url: websiteUrl,
    domain: getDomainFromUrl(rawDomain) || getDomainFromUrl(websiteUrl) || undefined,
  } as any;
}

function normalizedCompanyToListItem(row: CompanyRow): CompanyListItem {
  // Parse array fields in case they come as strings
  const parseArrayField = (value: unknown): string[] | undefined => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string" && value.length > 0) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : undefined;
      } catch {
        return undefined;
      }
    }
    return undefined;
  };

  return {
    id: String(row.id),
    name: row.name,
    short_name: row.short_name ?? undefined,
    logo_url: (row as any).company_logo?.[0]?.logo_url || row.logo_url || undefined,
    category: row.category ?? undefined,
    employee_size: row.employee_size ?? undefined,
    focus_sectors: parseArrayField(row.focus_sectors) ?? undefined,
    hiring_velocity: row.hiring_velocity ?? undefined,
    profitability_status: row.profitability_status ?? undefined,
    remote_policy_details: row.remote_policy_details ?? undefined,
    yoy_growth_rate: row.yoy_growth_rate ?? undefined,
    brand_value: row.brand_value ?? undefined,
    website_url: row.website_url ?? undefined,
    domain: getDomainFromUrl((row as any).domain) || getDomainFromUrl(row.website_url) || undefined,
    city: (row as any).city ?? undefined,
    country: (row as any).country ?? undefined,
    location:
      (row as any).city && (row as any).country
        ? `${(row as any).city}, ${(row as any).country}`
        : (row as any).country || (row as any).city || undefined,
    employee_count: (row as any).employee_count ?? undefined,
  };
}

function normalizedCompanyToCompanyRow(row: CompanyRow): CompanyRow {
  return {
    ...row,
    id: String(row.id),
    domain: (row as any).domain || getDomainFromUrl(row.website_url) || undefined,
  } as CompanyRow;
}

export interface CompanyListFilters {
  q?: string;
  category?: string | null;
  focusSector?: string | null;
  employeeSize?: string | null;
  profitability?: string | null;
  remotePolicy?: string | null;
  hiringVelocity?: string | null;
  sort?: "name" | "employee_size" | "yoy_growth_rate" | "brand_value";
  ascending?: boolean;
  limit?: number;
}

export function useCompanies(filters: CompanyListFilters = {}) {
  return useQuery({
    queryKey: ["companies", filters],
    queryFn: async (): Promise<CompanyListItem[]> => {
      const source = await resolveCompanySource();

      if (source === "company_json") {
        const { data, error } = await supabase
          .from("company_json")
          .select("company_id, short_json, full_json");
        if (error) throw error;
        return applyListFilters(
          (data ?? []).map((item) => companyJsonToListItem(item)),
          filters,
        );
      }

      let query = supabase.from("company").select(
        "id, name, short_name, logo_url, website_url, category, employee_size, focus_sectors, hiring_velocity, profitability_status, remote_policy_details, yoy_growth_rate, brand_value, city, country, employee_count, company_logo(logo_url)",
      );

      if (filters.q && filters.q.trim()) {
        const term = `%${filters.q.trim()}%`;
        query = query.or(`name.ilike.${term},short_name.ilike.${term}`);
      }
      if (filters.category) query = query.eq("category", filters.category);
      if (filters.employeeSize) query = query.eq("employee_size", filters.employeeSize);
      if (filters.profitability) query = query.eq("profitability_status", filters.profitability);
      if (filters.remotePolicy) query = query.eq("remote_policy_details", filters.remotePolicy);
      if (filters.hiringVelocity) query = query.eq("hiring_velocity", filters.hiringVelocity);
      if (filters.focusSector) query = query.contains("focus_sectors", [filters.focusSector]);

      const sort = filters.sort ?? "name";
      query = query.order(sort, {
        ascending: filters.ascending ?? true,
        nullsFirst: false,
      });
      if (filters.limit) query = query.limit(filters.limit);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((item) => normalizedCompanyToListItem(item as any));
    },
  });
}

export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: ["company", id],
    enabled: !!id,
    queryFn: async (): Promise<CompanyRow | null> => {
      if (!id) return null;
      const source = await resolveCompanySource();

      if (source === "company_json") {
        const { data, error } = await supabase
          .from("company_json")
          .select("company_id, full_json")
          .eq("company_id", id)
          .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return companyJsonToCompanyRow(data);
      }

      const { data, error } = await supabase
        .from("company")
        .select("*, company_logo(logo_url)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return normalizedCompanyToCompanyRow(data as CompanyRow);
    },
  });
}

export async function fetchCompaniesByIds(ids: string[]): Promise<CompanyRow[]> {
  const source = await resolveCompanySource();

  if (source === "company_json") {
    const { data, error } = await supabase
      .from("company_json")
      .select("company_id, full_json")
      .in("company_id", ids);
    if (error) throw error;
    return (data ?? []).map((item) => companyJsonToCompanyRow(item));
  }

  const { data, error } = await supabase.from("company").select("*").in("id", ids);
  if (error) throw error;
  return (data ?? []).map((item) => normalizedCompanyToCompanyRow(item as CompanyRow));
}

export function useCompaniesByIds(ids: string[]) {
  return useQuery({
    queryKey: ["companies-by-ids", ids],
    enabled: ids.length > 0,
    queryFn: async (): Promise<CompanyRow[]> => {
      return fetchCompaniesByIds(ids);
    },
  });
}

/** Aggregate stats for the home dashboard. */
export function useCompanyStats() {
  return useQuery({
    queryKey: ["company-stats"],
    queryFn: async () => {
      const source = await resolveCompanySource();

      if (source === "company_json") {
        const { data, error } = await supabase.from("company_json").select("short_json");
        if (error) throw error;
        const rows = data ?? [];

        const tally = <T extends string | null>(key: string) => {
          const map = new Map<string, number>();
          for (const r of rows) {
            const v = (r.short_json as Record<string, unknown>)[key] as T;
            if (!hasUsableValue(v)) continue;
            const bucketed = bucketValue(key, String(v));
            map.set(bucketed, (map.get(bucketed) ?? 0) + 1);
          }
          return Array.from(map.entries())
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count);
        };

        return {
          total: rows.length,
          byCategory: tally("category"),
          byProfitability: tally("profitability_status"),
          byRemotePolicy: tally("remote_policy_details"),
          byHiringVelocity: tally("hiring_velocity"),
          byEmployeeSize: tally("employee_size"),
        };
      }

      const { data, error } = await supabase
        .from("company")
        .select(
          "category, profitability_status, remote_policy_details, hiring_velocity, employee_size",
        );
      if (error) throw error;
      const rows = (data ?? []) as CompanyRow[];

      const tally = <T extends string | null>(key: string, getter: (row: CompanyRow) => T) => {
        const map = new Map<string, number>();
        for (const r of rows) {
          const v = getter(r);
          if (!hasUsableValue(v)) continue;
          const bucketed = bucketValue(key, String(v));
          map.set(bucketed, (map.get(bucketed) ?? 0) + 1);
        }
        return Array.from(map.entries())
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count);
      };

      return {
        total: rows.length,
        byCategory: tally("category", (row) => row.category),
        byProfitability: tally("profitability_status", (row) => row.profitability_status),
        byRemotePolicy: tally("remote_policy_details", (row) => row.remote_policy_details),
        byHiringVelocity: tally("hiring_velocity", (row) => row.hiring_velocity),
        byEmployeeSize: tally("employee_size", (row) => row.employee_size),
      };
    },
  });
}

/** Distinct value lists for filter dropdowns — derived from real DB rows. */
export function useFilterFacets() {
  return useQuery({
    queryKey: ["filter-facets"],
    queryFn: async () => {
      const source = await resolveCompanySource();

      if (source === "company_json") {
        const { data, error } = await supabase.from("company_json").select("short_json");
        if (error) throw error;
        const rows = data ?? [];
        const uniq = (key: string): string[] => {
          const s = new Set<string>();
          for (const r of rows) {
            const v = (r.short_json as Record<string, unknown>)[key] as string;
            if (typeof v === "string" && v.trim()) s.add(v);
          }
          return Array.from(s).sort();
        };
        const sectors = new Set<string>();
        for (const r of rows) {
          const arr = (r.short_json as Record<string, unknown>).focus_sectors as string[] | null;
          if (Array.isArray(arr)) {
            arr.forEach((s) => {
              if (s) sectors.add(s);
            });
          }
        }
        return {
          category: uniq("category"),
          employee_size: uniq("employee_size"),
          profitability_status: uniq("profitability_status"),
          remote_policy_details: uniq("remote_policy_details"),
          hiring_velocity: uniq("hiring_velocity"),
          focus_sectors: Array.from(sectors).sort(),
        };
      }

      const { data, error } = await supabase
        .from("company")
        .select(
          "category, employee_size, profitability_status, remote_policy_details, hiring_velocity, focus_sectors",
        );
      if (error) throw error;
      const rows = (data ?? []) as CompanyRow[];
      const uniq = (
        getter: (row: CompanyRow) => string | null | string[] | undefined,
      ): string[] => {
        const set = new Set<string>();
        for (const row of rows) {
          const value = getter(row);
          if (typeof value === "string" && value.trim()) set.add(value);
          if (Array.isArray(value)) {
            value.forEach((item) => {
              if (item) set.add(item);
            });
          }
        }
        return Array.from(set).sort();
      };

      return {
        category: uniq((row) => row.category),
        employee_size: uniq((row) => row.employee_size),
        profitability_status: uniq((row) => row.profitability_status),
        remote_policy_details: uniq((row) => row.remote_policy_details),
        hiring_velocity: uniq((row) => row.hiring_velocity),
        focus_sectors: uniq((row) => row.focus_sectors),
      };
    },
  });
}
