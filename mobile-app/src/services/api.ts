import {
    CompanyListItem,
    CompanyRow,
    CompanyStats,
    CompanyListFilters,
    CompanyJobRoles,
    CompanyInnovX,
} from '../types/company';

const SUPABASE_URL = 'https://hkwessehtaonqaakzyvj.supabase.co';
const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrd2Vzc2VodGFvbnFhYWt6eXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTEwMzksImV4cCI6MjA5MTg4NzAzOX0.4w-K12jyYlGT3dDXNa6ypRyhzheM2FkG5VLmmeB7GN8';

type CompanySource = 'company_json' | 'company';
let cachedCompanySource: CompanySource | undefined;

async function resolveCompanySource(): Promise<CompanySource> {
    if (cachedCompanySource) return cachedCompanySource;

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/company_json?select=company_id&limit=1`, {
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
        });

        if (response.ok) {
            cachedCompanySource = 'company_json';
            return cachedCompanySource;
        }

        if (response.status === 205) {
            cachedCompanySource = 'company';
            return cachedCompanySource;
        }
    } catch {
        // Default to company_json on error
    }

    cachedCompanySource = 'company_json';
    return cachedCompanySource;
}

function bucketValue(key: string, value: string): string {
    const v = value.toLowerCase();
    
    if (key === 'hiring_velocity') {
        if (v.includes('rapid') || v.includes('high') || v.includes('fast')) return 'High Velocity';
        if (v.includes('moderate') || v.includes('steady')) return 'Moderate';
        if (v.includes('slow') || v.includes('frozen') || v.includes('paused')) return 'Low / Paused';
        if (v.includes('expanding')) return 'Expanding';
        return 'Moderate';
    }
    
    if (key === 'remote_policy_details') {
        if (v.includes('remote-first') || v.includes('fully distributed') || v.includes('100% remote')) return 'Remote';
        if (v.includes('hybrid')) return 'Hybrid';
        if (v.includes('on-site') || v.includes('office-centric') || v.includes('in-person')) return 'On-site';
        return 'Hybrid';
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

function extractDomain(url: string | null | undefined): string | undefined {
    if (!url) return undefined;
    try {
        let clean = url.toLowerCase().trim();
        // Remove protocol
        clean = clean.replace(/^https?:\/\//, '');
        // Remove www.
        clean = clean.replace(/^www\./, '');
        // Take only the hostname part (before first / or ?)
        clean = clean.split(/[/?#]/)[0];
        // Remove any remaining garbage (only allow a-z, 0-9, dots, hyphens)
        clean = clean.replace(/[^a-z0-9.-]/g, '');
        
        return clean || undefined;
    } catch {
        return undefined;
    }
}

async function fetchApi<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>
): Promise<T> {
    const queryString = params
        ? '?' +
        Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => `${k}=${encodeURIComponent(v as string | number | boolean)}`)
            .join('&')
        : '';

    const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}${queryString}`, {
        headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'count=exact',
        },
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
}

// Company API
export async function getCompanies(filters: CompanyListFilters = {}): Promise<CompanyListItem[]> {
    const source = await resolveCompanySource();

    if (source === 'company_json') {
        const data = await fetchApi<{ company_id: string | number; short_json: unknown }[]>(
            'company_json',
            {
                select: 'company_id,short_json',
            }
        );

        return data
            .map((item) => {
                const shortJson =
                    item.short_json && typeof item.short_json === 'object' ? (item.short_json as any) : {};
                const fullJson = (item as any).full_json as Record<string, unknown> | undefined;
                
                const city = shortJson.city || fullJson?.city || undefined;
                const country = shortJson.country || fullJson?.country || undefined;
                const location = city && country ? `${city}, ${country}` : country || city || undefined;
                const employeeCount = shortJson.employee_count || fullJson?.employee_count || undefined;

                return {
                    id: String(item.company_id),
                    name: shortJson.name ?? 'Unknown company',
                    ...shortJson,
                    city,
                    country,
                    location,
                    employee_count: employeeCount,
                    domain: extractDomain(shortJson.website_url),
                } as CompanyListItem;
            })
            .filter((company) => {
                if (filters.q) {
                    const q = filters.q.toLowerCase();
                    return (
                        company.name.toLowerCase().includes(q) ||
                        (company.short_name && company.short_name.toLowerCase().includes(q)) ||
                        (company.focus_sectors &&
                            company.focus_sectors.some((s) => s.toLowerCase().includes(q)))
                    );
                }
                return true;
            })
            .slice(0, filters.limit ?? 100);
    }

    const data = await fetchApi<CompanyRow[]>('company', {
        select:
            'id,name,short_name,logo_url,website_url,category,employee_size,focus_sectors,hiring_velocity,profitability_status,remote_policy_details,yoy_growth_rate,brand_value,city,country,employee_count',
        limit: filters.limit ?? 100,
        order: `${filters.sort ?? 'name'}.${filters.ascending !== false ? 'asc' : 'desc'}`,
    });

    return data.map(item => ({
        ...item,
        location: item.city && item.country ? `${item.city}, ${item.country}` : item.country || item.city || undefined,
        domain: extractDomain(item.website_url)
    })) as CompanyListItem[];
}

export async function getCompany(id: string): Promise<CompanyRow | null> {
    const source = await resolveCompanySource();

    if (source === 'company_json') {
        const data = await fetchApi<{ company_id: string; full_json: unknown }[]>('company_json', {
            company_id: `eq.${id}`,
            select: 'company_id,full_json',
        });

        if (data.length === 0) return null;

        const item = data[0];
        const fullJson = item.full_json as Record<string, unknown>;
        const city = (fullJson as any).city || undefined;
        const country = (fullJson as any).country || undefined;
        return {
            id: String(item.company_id),
            ...fullJson,
            city,
            country,
            location: city && country ? `${city}, ${country}` : country || city || undefined,
            employee_count: (fullJson as any).employee_count || undefined,
            domain: extractDomain((fullJson as any).website_url),
        } as CompanyRow;
    }

    const data = await fetchApi<CompanyRow[]>('company', {
        id: `eq.${id}`,
        select: '*',
    });

    return data.length > 0 ? data[0] : null;
}

export async function getCompanyStats(): Promise<CompanyStats> {
    const source = await resolveCompanySource();

    if (source === 'company_json') {
        const data = await fetchApi<{ short_json: unknown }[]>('company_json', {
            select: 'short_json',
        });

        const tally = <T extends string | null>(key: string) => {
            const map = new Map<string, number>();
            for (const row of data) {
                const value = (row.short_json as Record<string, unknown>)[key] as T;
                if (value && String(value).trim() && String(value).toLowerCase() !== 'n/a') {
                    const bucketed = bucketValue(key, String(value));
                    map.set(bucketed, (map.get(bucketed) ?? 0) + 1);
                }
            }
            return Array.from(map.entries())
                .map(([label, count]) => ({ label, count }))
                .sort((a, b) => b.count - a.count);
        };

        return {
            total: data.length,
            byCategory: tally('category'),
            byProfitability: tally('profitability_status'),
            byRemotePolicy: tally('remote_policy_details'),
            byHiringVelocity: tally('hiring_velocity'),
            byEmployeeSize: tally('employee_size'),
        };
    }

    const data = await fetchApi<CompanyRow[]>('company', {
        select:
            'category,profitability_status,remote_policy_details,hiring_velocity,employee_size',
    });

    const tally = <T extends string | null | undefined>(key: string, getter: (row: CompanyRow) => T) => {
        const map = new Map<string, number>();
        for (const row of data) {
            const value = getter(row);
            if (value && String(value).trim() && String(value).toLowerCase() !== 'n/a') {
                const bucketed = bucketValue(key, String(value));
                map.set(bucketed, (map.get(bucketed) ?? 0) + 1);
            }
        }
        return Array.from(map.entries())
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count);
    };

    return {
        total: data.length,
        byCategory: tally('category', (row) => row.category),
        byProfitability: tally('profitability_status', (row) => row.profitability_status),
        byRemotePolicy: tally('remote_policy_details', (row) => row.remote_policy_details),
        byHiringVelocity: tally('hiring_velocity', (row) => row.hiring_velocity),
        byEmployeeSize: tally('employee_size', (row) => row.employee_size),
    };
}

export async function getFilterFacets(): Promise<{
    category: string[];
    employee_size: string[];
    profitability_status: string[];
    remote_policy_details: string[];
    hiring_velocity: string[];
    focus_sectors: string[];
}> {
    const source = await resolveCompanySource();

    if (source === 'company_json') {
        const data = await fetchApi<{ short_json: unknown }[]>('company_json', {
            select: 'short_json',
        });

        const uniq = (key: string): string[] => {
            const set = new Set<string>();
            for (const row of data) {
                const value = (row.short_json as Record<string, unknown>)[key] as string;
                if (typeof value === 'string' && value.trim()) {
                    set.add(value);
                }
            }
            return Array.from(set).sort();
        };

        const sectors = new Set<string>();
        for (const row of data) {
            const arr = (row.short_json as Record<string, unknown>).focus_sectors as string[];
            if (Array.isArray(arr)) {
                arr.forEach((s) => {
                    if (s) sectors.add(s);
                });
            }
        }

        return {
            category: uniq('category'),
            employee_size: uniq('employee_size'),
            profitability_status: uniq('profitability_status'),
            remote_policy_details: uniq('remote_policy_details'),
            hiring_velocity: uniq('hiring_velocity'),
            focus_sectors: Array.from(sectors).sort(),
        };
    }

    const data = await fetchApi<CompanyRow[]>('company', {
        select:
            'category,employee_size,profitability_status,remote_policy_details,hiring_velocity,focus_sectors',
    });

    const uniq = (
        getter: (row: CompanyRow) => string | null | string[] | undefined
    ): string[] => {
        const set = new Set<string>();
        for (const row of data) {
            const value = getter(row);
            if (typeof value === 'string' && value.trim()) {
                set.add(value);
            }
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
}

// Job Roles API
export async function getJobRoleDetails(companyId: string): Promise<CompanyJobRoles | null> {
    const data = await fetchApi<{ company_id: string; company_name: string; job_role_json: unknown }[]>(
        'job_role_details_json',
        {
            company_id: `eq.${companyId}`,
            select: 'company_id,company_name,job_role_json',
            order: 'id.asc',
        }
    );

    if (data.length === 0) return null;

    const roles: any[] = [];
    for (const row of data) {
        const json = row.job_role_json as any;
        if (json && json.job_role_details && Array.isArray(json.job_role_details)) {
            for (const detail of json.job_role_details) {
                roles.push({
                    role_title: detail.role_title || 'Unknown Role',
                    role_category: detail.role_category,
                    opportunity_type: detail.opportunity_type,
                    compensation: detail.compensation,
                    ctc_or_stipend: detail.ctc_or_stipend,
                    job_description: detail.job_description,
                    bonus: detail.bonus,
                    benefits_summary: detail.benefits_summary,
                    rounds: Array.isArray(detail.hiring_rounds)
                        ? detail.hiring_rounds.map((round: any, index: number) => ({
                            id: Number(`${row.company_id}${String(index + 1).padStart(3, '0')}`),
                            company_id: Number(row.company_id),
                            round_order: round.round_number ?? index + 1,
                            round_name: round.name ?? round.round ?? `Round ${index + 1}`,
                            round_type: round.type,
                            description: round.description,
                            difficulty_level: round.difficulty_level,
                            elimination_rate: round.elimination_rate,
                            preparation_focus: round.preparation_focus,
                            tips: round.tips,
                            round_category: round.round_category,
                            assessment_mode: round.assessment_mode,
                            evaluation_type: round.evaluation_type,
                            skill_sets: [],
                        }))
                        : [],
                });
            }
        }
    }

    return {
        companyId,
        company_name: data[0].company_name,
        roles,
    };
}

// InnovX API
export async function getInnovX(companyId: string): Promise<CompanyInnovX | null> {
    const data = await fetchApi<{ id: string; company_id: string; name: string; json_data: unknown }[]>(
        'innovx_json',
        {
            company_id: `eq.${companyId}`,
            select: 'id,company_id,name,json_data',
        }
    );

    if (data.length === 0) return null;

    const row = data[0];
    const jsonData = row.json_data as any;

    return {
        id: row.id,
        companyId: String(row.company_id),
        companyName: row.name,
        data: {
            company_strategy: jsonData?.company_strategy ?? null,
            digital_transformation_focus: Array.isArray(jsonData?.digital_transformation_focus)
                ? jsonData.digital_transformation_focus
                : [],
            business_problems: Array.isArray(jsonData?.business_problems)
                ? jsonData.business_problems
                : [],
            innovation_areas: Array.isArray(jsonData?.innovation_areas)
                ? jsonData.innovation_areas
                : [],
            required_skills: Array.isArray(jsonData?.required_skills)
                ? jsonData.required_skills
                : [],
            recommended_projects: Array.isArray(jsonData?.recommended_projects)
                ? jsonData.recommended_projects.map((p: any) => ({
                    title: p.title ?? 'Untitled',
                    description: p.description ?? '',
                    tech_stack: Array.isArray(p.tech_stack) ? p.tech_stack : [],
                    difficulty: p.difficulty ?? 'Medium',
                    expected_outcome: p.expected_outcome ?? '',
                }))
                : [],
            preparation_strategy: jsonData?.preparation_strategy ?? null,
            differentiation_tip: jsonData?.differentiation_tip ?? null,
        },
        innovationType: 'General',
    };
}

export async function getInnovXIndex(): Promise<CompanyInnovX[]> {
    const data = await fetchApi<{ id: string; company_id: string; name: string; json_data: unknown }[]>(
        'innovx_json',
        {
            select: 'id,company_id,name,json_data',
            order: 'name.asc',
        }
    );

    return data.map((row) => {
        const jsonData = row.json_data as any;
        return {
            id: row.id,
            companyId: String(row.company_id),
            companyName: row.name,
            data: {
                company_strategy: jsonData?.company_strategy ?? null,
                digital_transformation_focus: Array.isArray(jsonData?.digital_transformation_focus)
                    ? jsonData.digital_transformation_focus
                    : [],
                business_problems: Array.isArray(jsonData?.business_problems)
                    ? jsonData.business_problems
                    : [],
                innovation_areas: Array.isArray(jsonData?.innovation_areas)
                    ? jsonData.innovation_areas
                    : [],
                required_skills: Array.isArray(jsonData?.required_skills)
                    ? jsonData.required_skills
                    : [],
                recommended_projects: Array.isArray(jsonData?.recommended_projects)
                    ? jsonData.recommended_projects.map((p: any) => ({
                        title: p.title ?? 'Untitled',
                        description: p.description ?? '',
                        tech_stack: Array.isArray(p.tech_stack) ? p.tech_stack : [],
                        difficulty: p.difficulty ?? 'Medium',
                        expected_outcome: p.expected_outcome ?? '',
                    }))
                    : [],
                preparation_strategy: jsonData?.preparation_strategy ?? null,
                differentiation_tip: jsonData?.differentiation_tip ?? null,
            },
            innovationType: 'General',
        };
    });
}

// Hiring count
export async function getHiringCount(): Promise<number> {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/job_role_details_json`,
            {
                method: 'HEAD',
                headers: {
                    apikey: SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                    Prefer: 'count=exact',
                },
            }
        );

        const contentRange = response.headers.get('content-range');
        if (contentRange) {
            const match = contentRange.match(/\/(\d+)/);
            if (match) {
                return parseInt(match[1], 10);
            }
        }
    } catch {
        // Return 0 on error
    }
    return 0;
}

export async function getInnovXCount(): Promise<number> {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/innovx_json`,
            {
                method: 'HEAD',
                headers: {
                    apikey: SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                    Prefer: 'count=exact',
                },
            }
        );

        const contentRange = response.headers.get('content-range');
        if (contentRange) {
            const match = contentRange.match(/\/(\d+)/);
            if (match) {
                return parseInt(match[1], 10);
            }
        }
    } catch {
        // Return 0 on error
    }
    return 0;
}