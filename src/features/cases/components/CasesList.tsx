'use client';

import { useState, useMemo, memo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/features/auth/store';
import { useCases } from '../api';
import type { Appointment, Case } from '../types';
import { CaseStatus } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Briefcase,
  Search,
  Plus,
  Calendar,
  Clock,
  User,
  MapPin,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { CaseCardPlaceholder } from '@/components/ui/progressive-placeholder';
import { SimpleSkeleton, SkeletonText } from '@/components/ui/simple-skeleton';
import { ScheduleAppointmentDialog } from './ScheduleAppointmentDialog';
import { formatDateTime } from '@/lib/utils/helpers';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/utils/axios';
import { toast } from 'sonner';
import { CASES_KEY } from '../api';
import type { CasesApiResponse } from '../api/queries';

// Status and service labels will be translated in the component using useTranslation
const statusConfig: Record<string, { className: string }> = {
  SUBMITTED: {
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  },
  UNDER_REVIEW: {
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  },
  DOCUMENTS_REQUIRED: {
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  },
  PROCESSING: {
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  },
  APPROVED: {
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  },
  REJECTED: {
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  },
  CLOSED: {
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  },
};

const serviceLabels: Record<string, string> = {
  STUDENT_VISA: 'Student Visa',
  WORK_PERMIT: 'Work Permit',
  FAMILY_REUNIFICATION: 'Family Reunification',
  TOURIST_VISA: 'Tourist Visa',
  BUSINESS_VISA: 'Business Visa',
  PERMANENT_RESIDENCY: 'Permanent Residency',
};

export function CasesList() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Optimized for mobile performance
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [optimisticAppointments, setOptimisticAppointments] = useState<Record<string, Appointment>>(
    {}
  );
  const [optimisticClosedCases, setOptimisticClosedCases] = useState<Record<string, boolean>>({});
  const closingCaseIdRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useCases(
    { status: statusFilter !== 'all' ? statusFilter : undefined },
    {
      staleTime: 60000, // Cache for 60 seconds
      gcTime: 600000, // Keep in cache for 10 minutes
      refetchOnMount: false, // Use cached data
      refetchOnWindowFocus: false, // Don't refetch on tab switch
    }
  );

  const cases: Case[] = data?.cases || [];

  // Remove optimistic closed markers once server data reflects status
  useEffect(() => {
    setOptimisticClosedCases((prev) => {
      let changed = false;
      const next = { ...prev };
      Object.keys(next).forEach((caseId) => {
        const match = cases.find((item) => item.id === caseId);
        if (!match || match.status === CaseStatus.CLOSED) {
          delete next[caseId];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [cases]);

  // IMPORTANT: All hooks must be called BEFORE any conditional returns
  // Memoize filtered results for performance
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return cases.filter((c: Case) => {
      if (!q) return true;
      const label = (serviceLabels[c.serviceType] ?? '').toLowerCase();
      return c.referenceNumber.toLowerCase().includes(q) || label.includes(q);
    });
  }, [cases, searchQuery]);

  // Pagination calculations (memoized to avoid recalculating on every render)
  const pagination = useMemo(() => {
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedCases = filtered.slice(startIndex, endIndex);
    return { totalPages, startIndex, endIndex, paginatedCases };
  }, [filtered, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  }, []);

  const handleManageAppointment = useCallback((caseItem: Case) => {
    setSelectedCase(caseItem);
    setAppointmentDialogOpen(true);
  }, []);

  const handleAppointmentDialogChange = useCallback((open: boolean) => {
    setAppointmentDialogOpen(open);
    if (!open) {
      setSelectedCase(null);
    }
  }, []);

  const handleAppointmentScheduled = useCallback((appointment: Appointment, caseId: string) => {
    setOptimisticAppointments((prev) => ({
      ...prev,
      [caseId]: appointment,
    }));
    setOptimisticClosedCases((prev) => {
      if (!prev[caseId]) return prev;
      const next = { ...prev };
      delete next[caseId];
      return next;
    });
  }, []);

  type UpdateStatusVariables = { caseId: string; status: CaseStatus };
  type UpdateStatusContext = {
    previousQueries: Array<[readonly unknown[], CasesApiResponse | undefined]>;
  };
  type UpdateStatusResponse = Case;

  const updateCaseStatusMutation = useMutation<
    UpdateStatusResponse,
    Error,
    UpdateStatusVariables,
    UpdateStatusContext
  >({
    mutationFn: async ({ caseId, status }) => {
      const response = await apiClient.patch(`/api/cases/${caseId}/status`, { status });
      return response.data.data;
    },
    onMutate: async ({ caseId, status }) => {
      await queryClient.cancelQueries({ queryKey: [CASES_KEY] });
      const previousQueries = queryClient.getQueriesData<CasesApiResponse>({
        queryKey: [CASES_KEY],
      });
      setOptimisticClosedCases((prev) => ({
        ...prev,
        [caseId]: status === CaseStatus.CLOSED,
      }));
      previousQueries.forEach(([key, value]) => {
        if (!value) return;
        queryClient.setQueryData<CasesApiResponse | undefined>(key, {
          ...value,
          cases: value.cases.map((caseItem) =>
            caseItem.id === caseId ? { ...caseItem, status } : caseItem
          ),
        });
      });
      closingCaseIdRef.current = caseId;
      return { previousQueries };
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, previousData]) => {
          if (Array.isArray(queryKey)) {
            queryClient.setQueryData(queryKey, previousData);
          }
        });
      }
      setOptimisticClosedCases((prev) => {
        const next = { ...prev };
        delete next[variables.caseId];
        return next;
      });
      const errorMessage =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        t('cases.failedToUpdateStatus') ||
        'Failed to update case status. Please try again.';
      toast.error(errorMessage);
    },
    onSuccess: (_, variables) => {
      toast.success(t('cases.caseMarkedAsClosed') || 'Case marked as closed.');
      setOptimisticAppointments((prev) => {
        if (!prev[variables.caseId]) return prev;
        const next = { ...prev };
        delete next[variables.caseId];
        return next;
      });
    },
    onSettled: (_, __, variables) => {
      closingCaseIdRef.current = null;
      queryClient.invalidateQueries({ queryKey: [CASES_KEY] });
      queryClient.invalidateQueries({ queryKey: [CASES_KEY, variables.caseId] });
    },
  });

  const markCaseClosed = useCallback(
    (caseItem: Case) => {
      if (updateCaseStatusMutation.isPending && closingCaseIdRef.current === caseItem.id) return;
      if (typeof window !== 'undefined') {
        const confirmed = window.confirm(
          t('cases.markCaseAsClosedConfirm', { referenceNumber: caseItem.referenceNumber }) ||
            `Mark case ${caseItem.referenceNumber} as closed? This will move it out of the active list.`
        );
        if (!confirmed) {
          return;
        }
      }
      updateCaseStatusMutation.mutate({ caseId: caseItem.id, status: CaseStatus.CLOSED });
    },
    [updateCaseStatusMutation]
  );

  // PERFORMANCE: Only show skeleton on first load (no cached data)
  // IMPORTANT: Early returns must come AFTER all hooks
  const isFirstLoad = isLoading && !data;
  if (isFirstLoad) return <CasesListSkeleton />;
  if (error)
    return (
      <div className="text-center py-12">
        <p className="text-red-600">
          {t('cases.errorLoadingCases') || 'Error loading cases. Please try again.'}
        </p>
      </div>
    );

  const isClient = user?.role === 'CLIENT';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            {isClient ? t('cases.myCases') || 'My Cases' : t('cases.title') || 'Cases'}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
            {isClient
              ? t('cases.viewAndTrack') || 'View and track your immigration cases'
              : t('cases.manageAll') || 'Manage all immigration cases'}
          </p>
        </div>
        {!isClient && (
          <Button
            asChild
            style={{
              backgroundColor: '#361d22',
              borderColor: '#ff4538',
              borderWidth: '1px',
              borderStyle: 'solid',
              color: 'white',
            }}
            className="hover:opacity-90"
          >
            <Link href="/dashboard/cases/new">
              <Plus className="mr-2 h-4 w-4" style={{ color: '#ff4538' }} />
              {t('cases.newCase') || 'New Case'}
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <Search
                className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4"
                style={{ color: '#ff4538' }}
              />
              <Input
                aria-label={
                  t('cases.searchAriaLabel') || 'Search cases by reference number or service type'
                }
                placeholder={
                  t('cases.searchPlaceholder') || 'Search by reference or service type...'
                }
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-8 sm:pl-10 text-xs sm:text-sm h-9 sm:h-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('cases.allStatus') || 'All Status'}</SelectItem>
                <SelectItem value="SUBMITTED">
                  {t('cases.status.submitted') || 'Submitted'}
                </SelectItem>
                <SelectItem value="UNDER_REVIEW">
                  {t('cases.status.underReview') || 'Under Review'}
                </SelectItem>
                <SelectItem value="DOCUMENTS_REQUIRED">
                  {t('cases.status.documentsRequired') || 'Documents Required'}
                </SelectItem>
                <SelectItem value="PROCESSING">
                  {t('cases.status.processing') || 'Processing'}
                </SelectItem>
                <SelectItem value="APPROVED">{t('cases.status.approved') || 'Approved'}</SelectItem>
                <SelectItem value="REJECTED">{t('cases.status.rejected') || 'Rejected'}</SelectItem>
                <SelectItem value="CLOSED">{t('cases.status.closed') || 'Closed'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {t('cases.noCasesFound') || 'No Cases Found'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all'
                ? t('cases.tryAdjustingFilters') || 'Try adjusting your filters'
                : isClient
                  ? t('cases.noCasesYet') || 'You do not have any cases yet'
                  : t('cases.noCasesCreated') || 'No cases created yet'}
            </p>
            {!isClient && (
              <Button asChild>
                <Link href="/dashboard/cases/new">
                  {t('cases.createFirstCase') || 'Create First Case'}
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {pagination.paginatedCases.map((c: Case) => {
              const optimisticAppointment = optimisticAppointments[c.id];
              const appointmentInfo = optimisticAppointment ?? c.appointments?.[0] ?? null;
              const hasAppointment = Boolean(appointmentInfo);
              const caseStatus = optimisticClosedCases[c.id] ? CaseStatus.CLOSED : c.status;
              const isCaseClosed = caseStatus === CaseStatus.CLOSED;
              const isClosing =
                updateCaseStatusMutation.isPending && closingCaseIdRef.current === c.id;
              const appointmentLabel = appointmentInfo
                ? formatDateTime(appointmentInfo.scheduledAt)
                : '';

              return (
                <Card key={c.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 sm:gap-3 min-w-0">
                      <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2 min-w-0">
                          <Briefcase
                            className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0"
                            style={{ color: '#ff4538' }}
                          />
                          <span className="truncate">{c.referenceNumber}</span>
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm truncate">
                          {serviceLabels[c.serviceType] || c.serviceType}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <Badge
                          className={cn(
                            'flex items-center gap-1 whitespace-nowrap text-xs',
                            statusConfig[caseStatus]?.className || ''
                          )}
                        >
                          {t(`cases.statusLabels.${caseStatus}`) ||
                            t(`cases.status.${caseStatus.toLowerCase()}`) ||
                            caseStatus}
                        </Badge>
                        {hasAppointment &&
                          appointmentInfo &&
                          (appointmentInfo.status === 'SCHEDULED' ||
                            appointmentInfo.status === 'RESCHEDULED') && (
                            <Badge
                              className="flex items-center gap-1 whitespace-nowrap text-xs"
                              style={{
                                backgroundColor: '#ff4538',
                                color: 'white',
                                border: 'none',
                              }}
                            >
                              <Calendar className="h-3 w-3 flex-shrink-0" />
                              <span className="hidden sm:inline">
                                {t('cases.appointmentScheduled') || 'Appointment Scheduled'}
                              </span>
                              <span className="sm:hidden">
                                {t('cases.scheduled') || 'Scheduled'}
                              </span>
                            </Badge>
                          )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-3 sm:mb-4">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                        <Calendar
                          className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                          style={{ color: '#ff4538' }}
                        />
                        <span className="text-muted-foreground">
                          {t('cases.submitted') || 'Submitted'}:
                        </span>
                        <span>{new Date(c.submissionDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: '#ff4538' }} />
                        <span className="text-muted-foreground">
                          {t('cases.updated') || 'Updated'}:
                        </span>
                        <span>{new Date(c.lastUpdated).toLocaleDateString()}</span>
                      </div>
                      {c.assignedAgent && (
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                          <User
                            className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                            style={{ color: '#ff4538' }}
                          />
                          <span className="text-muted-foreground">
                            {t('cases.advisor') || 'Advisor'}:
                          </span>
                          <span>
                            {c.assignedAgent.firstName} {c.assignedAgent.lastName}
                          </span>
                        </div>
                      )}
                    </div>

                    {hasAppointment && (
                      <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3 rounded-md border border-dashed border-primary/40 bg-primary/5 px-2 sm:px-3 py-2 sm:py-3">
                        <div className="flex flex-col gap-1.5 sm:gap-2">
                          {appointmentInfo && (
                            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium">
                              <Calendar
                                className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0"
                                style={{ color: '#ff4538' }}
                              />
                              <span>{appointmentLabel}</span>
                            </div>
                          )}
                          {appointmentInfo?.location && (
                            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
                              <MapPin
                                className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0"
                                style={{ color: '#ff4538' }}
                              />
                              <span className="line-clamp-1">{appointmentInfo.location}</span>
                            </div>
                          )}
                        </div>
                        {!isClient && !isCaseClosed ? (
                          <Button
                            variant="default"
                            size="sm"
                            className="flex items-center gap-2"
                            disabled={isClosing}
                            onClick={() => markCaseClosed(c)}
                            style={{
                              backgroundColor: '#091a24',
                              borderColor: '#ff4538',
                              borderWidth: '1px',
                              borderStyle: 'solid',
                              color: 'white',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = '0.9';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = '1';
                            }}
                          >
                            {isClosing ? (
                              <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                {t('cases.closing') || 'Closing...'}
                              </>
                            ) : (
                              <>
                                <Briefcase className="h-4 w-4" />
                                {t('cases.markCaseAsClosed') || 'Mark Case as Closed'}
                              </>
                            )}
                          </Button>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-xs border-emerald-500 text-emerald-600 bg-emerald-50"
                          >
                            {t('cases.caseClosed') || 'Case Closed'}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {c.documents?.length || 0} {t('cases.documents') || 'documents'}
                      </span>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {!isClient && !isCaseClosed && c.status === CaseStatus.APPROVED && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleManageAppointment(c)}
                            style={{
                              backgroundColor: 'transparent',
                              borderColor: 'rgba(255, 69, 56, 0.3)',
                              borderWidth: '1px',
                              borderStyle: 'solid',
                              color: 'inherit',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(255, 69, 56, 0.5)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(255, 69, 56, 0.3)';
                            }}
                          >
                            <Calendar
                              className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4"
                              style={{ color: '#ff4538' }}
                            />
                            {hasAppointment
                              ? t('cases.updateAppointment') || 'Update Appointment'
                              : t('cases.scheduleAppointment') || 'Schedule Appointment'}
                          </Button>
                        )}
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          style={{
                            backgroundColor: 'transparent',
                            borderColor: 'rgba(255, 69, 56, 0.3)',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            color: 'inherit',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 69, 56, 0.5)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 69, 56, 0.3)';
                          }}
                        >
                          <Link href={`/dashboard/cases/${c.id}`}>
                            {t('cases.viewDetails') || 'View Details'}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination Controls - Mobile Optimized */}
          {pagination.totalPages > 1 && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm text-muted-foreground">
                    {t('cases.showing', {
                      from: pagination.startIndex + 1,
                      to: Math.min(pagination.endIndex, filtered.length),
                      total: filtered.length,
                    }) ||
                      `Showing ${pagination.startIndex + 1}-${Math.min(pagination.endIndex, filtered.length)} of ${filtered.length}`}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1">
                        {t('common.previous') || 'Previous'}
                      </span>
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                        .filter((page) => {
                          // Show first, last, current, and adjacent pages
                          return (
                            page === 1 ||
                            page === pagination.totalPages ||
                            Math.abs(page - currentPage) <= 1
                          );
                        })
                        .map((page, index, array) => (
                          <div key={page} className="flex items-center">
                            {index > 0 && array[index - 1] !== page - 1 && (
                              <span className="px-2 text-muted-foreground">...</span>
                            )}
                            <Button
                              variant={currentPage === page ? 'default' : 'ghost'}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="h-8 w-8 p-0 text-white"
                              style={
                                currentPage === page
                                  ? {
                                      backgroundColor: '#361d22',
                                      borderColor: '#ff4538',
                                      borderWidth: '1px',
                                      borderStyle: 'solid',
                                    }
                                  : {
                                      backgroundColor: '#143240',
                                      borderColor: '#ff4538',
                                      borderWidth: '1px',
                                      borderStyle: 'solid',
                                    }
                              }
                            >
                              {page}
                            </Button>
                          </div>
                        ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={currentPage === pagination.totalPages}
                    >
                      <span className="hidden sm:inline mr-1">{t('common.next') || 'Next'}</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {selectedCase && (
        <ScheduleAppointmentDialog
          caseId={selectedCase.id}
          caseReference={selectedCase.referenceNumber}
          clientName={
            selectedCase.client
              ? `${selectedCase.client.firstName ?? ''} ${selectedCase.client.lastName ?? ''}`.trim()
              : undefined
          }
          open={appointmentDialogOpen}
          onOpenChange={handleAppointmentDialogChange}
          onAppointmentScheduled={(appointment) =>
            handleAppointmentScheduled(appointment, selectedCase.id)
          }
        />
      )}
    </div>
  );
}

/**
 * PERFORMANCE OPTIMIZED: Progressive skeleton with real case card structure
 * - Shows actual case card layout immediately
 * - Better perceived performance than empty skeletons
 * - Mobile-optimized for instant display
 * - Reduced DOM elements while maintaining structure
 */
export const CasesListSkeleton = memo(function CasesListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonText size="xl" className="w-48" />
          <SkeletonText size="sm" className="w-80" />
        </div>
        <SimpleSkeleton className="h-10 w-32 rounded" />
      </div>

      {/* Search/Filter Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <SimpleSkeleton className="h-10 flex-1 rounded" />
            <SimpleSkeleton className="h-10 w-full sm:w-[200px] rounded" />
          </div>
        </CardContent>
      </Card>

      {/* Case Cards with Progressive Placeholders */}
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <CaseCardPlaceholder key={i} />
        ))}
      </div>
    </div>
  );
});
