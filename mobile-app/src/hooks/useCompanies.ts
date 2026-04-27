import { useQuery } from '@tanstack/react-query';
import { getCompanies, getCompany, getCompanyStats, getFilterFacets } from '../services/api';
import { CompanyListItem, CompanyRow, CompanyStats, CompanyListFilters } from '../types/company';

export function useCompaniesList(filters: CompanyListFilters = {}) {
    return useQuery<CompanyListItem[]>({
        queryKey: ['companies', filters],
        queryFn: () => getCompanies(filters),
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
}

export function useCompanyDetail(companyId: string | undefined) {
    return useQuery<CompanyRow | null>({
        queryKey: ['company', companyId],
        queryFn: () => getCompany(companyId!),
        enabled: !!companyId,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
}

export function useCompanyStats() {
    return useQuery<CompanyStats>({
        queryKey: ['company-stats'],
        queryFn: () => getCompanyStats(),
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
}

export function useFilterFacets() {
    return useQuery({
        queryKey: ['filter-facets'],
        queryFn: () => getFilterFacets(),
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
}