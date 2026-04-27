import { useQuery } from '@tanstack/react-query';
import { getJobRoleDetails } from '../services/api';
import { CompanyJobRoles } from '../types/company';

export function useJobRoleDetails(companyId: string | undefined) {
    return useQuery<CompanyJobRoles | null>({
        queryKey: ['job-role-details', companyId],
        queryFn: () => getJobRoleDetails(companyId!),
        enabled: !!companyId,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
}