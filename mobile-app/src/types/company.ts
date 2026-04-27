export interface CompanyListItem {
    id: string;
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
    city?: string;
    country?: string;
    location?: string;
    employee_count?: number;
}

export interface CompanyRow extends CompanyListItem {
    description?: string;
    headquarters_address?: string;
    founded_year?: number;
    website?: string;
    linkedin?: string;
    twitter?: string;
    operating_countries?: string[];
    office_locations?: string[];
    top_customers?: string[];
    key_competitors?: string[];
    key_investors?: string[];
    tech_stack?: string[];
    technology_partners?: string[];
    awards_recognitions?: string[];
    market_share_percentage?: number;
    diversity_inclusion_score?: number;
    runway_months?: number;
    burn_multiplier?: number;
    tech_adoption_rating?: number;
    website_rating?: number;
    glassdoor_rating?: number;
    indeed_rating?: number;
    google_rating?: number;
    brand_sentiment_score?: number;
}

export interface CompanyStats {
    total: number;
    byCategory: { label: string; count: number }[];
    byProfitability: { label: string; count: number }[];
    byRemotePolicy: { label: string; count: number }[];
    byHiringVelocity: { label: string; count: number }[];
    byEmployeeSize: { label: string; count: number }[];
}

export interface CompanyListFilters {
    q?: string;
    category?: string | null;
    focusSector?: string | null;
    employeeSize?: string | null;
    profitability?: string | null;
    remotePolicy?: string | null;
    hiringVelocity?: string | null;
    sort?: 'name' | 'employee_size' | 'yoy_growth_rate' | 'brand_value';
    ascending?: boolean;
    limit?: number;
}

export interface HiringRound {
    id: number;
    company_id: number;
    round_order: number;
    round_name: string;
    round_type: string | null;
    description: string | null;
    difficulty_level: string | null;
    elimination_rate: string | null;
    preparation_focus: string | null;
    tips: string | null;
    round_category: string | null;
    assessment_mode: string | null;
    evaluation_type: string | null;
    skill_sets: JobRoleSkillSet[];
}

export interface JobRoleSkillSet {
    skill_set_code: string;
    typical_questions: string;
}

export interface JobRole {
    role_title: string;
    role_category: string | null;
    opportunity_type: string | null;
    compensation: string | null;
    ctc_or_stipend: number | null;
    job_description: string | null;
    bonus: string | null;
    benefits_summary: string | null;
    rounds: HiringRound[];
}

export interface CompanyJobRoles {
    companyId: string;
    company_name: string;
    roles: JobRole[];
}

export interface InnovXProject {
    title: string;
    description: string;
    tech_stack: string[];
    difficulty: 'Easy' | 'Medium' | 'Hard' | string;
    expected_outcome: string;
}

export interface InnovXData {
    company_strategy: string | null;
    digital_transformation_focus: string[];
    business_problems: string[];
    innovation_areas: string[];
    required_skills: string[];
    recommended_projects: InnovXProject[];
    preparation_strategy: string | null;
    differentiation_tip: string | null;
}

export interface CompanyInnovX {
    id: string;
    companyId: string;
    companyName: string;
    data: InnovXData;
    innovationType: string;
}