import { useQuery } from '@tanstack/react-query';
import { getInnovX, getInnovXIndex, getInnovXCount } from '../services/api';
import { CompanyInnovX } from '../types/company';

export function useInnovX(companyId: string | undefined) {
    return useQuery<CompanyInnovX | null>({
        queryKey: ['innovx', companyId],
        queryFn: () => getInnovX(companyId!),
        enabled: !!companyId,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
}

export function useInnovXIndex() {
    return useQuery<CompanyInnovX[]>({
        queryKey: ['innovx-index'],
        queryFn: () => getInnovXIndex(),
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
}

export function useInnovXCount() {
    return useQuery<number>({
        queryKey: ['innovx-count'],
        queryFn: () => getInnovXCount(),
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
}