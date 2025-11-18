// React Query - Queries for Documents feature

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiClient } from '@/lib/utils/axios';
import { useAuthStore } from '@/features/auth/store';
import type { Document } from '../types';

export const DOCUMENTS_KEY = 'documents';

// Get all documents
export function useDocuments(
  filters?: { caseId?: string; type?: string; page?: number; limit?: number },
  options?: Omit<UseQueryOptions<{ documents: Document[] }>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();

  // MOBILE FIX: Stabilize query key to prevent unnecessary refetches on re-render
  // Create a stable key by serializing filters (React Query uses deep equality)
  const stableQueryKey = useMemo(() => {
    if (!filters) return [DOCUMENTS_KEY];
    // Create a stable object with only defined values
    const stableFilters: Record<string, string | number> = {};
    if (filters.caseId) stableFilters.caseId = filters.caseId;
    if (filters.type) stableFilters.type = filters.type;
    if (filters.page !== undefined) stableFilters.page = filters.page;
    if (filters.limit !== undefined) stableFilters.limit = filters.limit;
    return Object.keys(stableFilters).length > 0 ? [DOCUMENTS_KEY, stableFilters] : [DOCUMENTS_KEY];
  }, [filters?.caseId, filters?.type, filters?.page, filters?.limit]);

  return useQuery<{ documents: Document[] }>({
    queryKey: stableQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.caseId) params.append('caseId', filters.caseId);
      if (filters?.type) params.append('type', filters.type);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response = await apiClient.get(`/api/documents?${params}`);
      return response.data.data;
    },
    // MOBILE FIX: Allow queries when user exists (even if Firebase hasn't confirmed yet)
    // This handles the case where user is cached but isAuthenticated is still false
    enabled: !authLoading && (!!user || isAuthenticated),
    staleTime: 60 * 1000, // PERFORMANCE: 60 seconds cache
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    // MOBILE FIX: Refetch on mount if cache is empty (handles hard reload)
    refetchOnMount: true, // Always refetch on mount to handle empty cache scenarios
    refetchOnWindowFocus: process.env.NODE_ENV === 'development', // Only in dev
    // MOBILE FIX: Better retry logic for unreliable mobile networks
    retry: 2, // Retry twice for mobile networks
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff, max 5s
    ...options,
  });
}

// Get single document
export function useDocument(id: string) {
  return useQuery({
    queryKey: [DOCUMENTS_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get(`/api/documents/${id}`);
      return response.data.data.document as Document;
    },
    enabled: !!id,
  });
}
