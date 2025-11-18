'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/store';
import { useCases, CasesFilters } from '../api';
import { useUsers } from '@/features/users/api/queries';
import { useBulkCaseOperation, useExportCases } from '../api/mutations';
import { AssignCaseDialog } from './AssignCaseDialog';
import type { Case } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Briefcase,
  Search,
  Calendar,
  Clock,
  User,
  FileText,
  Edit,
  AlertTriangle,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Download,
  MoreVertical,
  CheckSquare,
  XSquare,
  Filter,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/utils/logger';

export function AgentCasesListEnhanced() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assignedAgentFilter, setAssignedAgentFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedCaseForAssignment, setSelectedCaseForAssignment] = useState<Case | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const itemsPerPage = 10;

  // Build server-side filters
  const filters: CasesFilters = {
    page: currentPage,
    limit: itemsPerPage,
  };

  if (statusFilter !== 'all') {
    filters.status = statusFilter;
  }

  if (serviceTypeFilter !== 'all') {
    filters.serviceType = serviceTypeFilter;
  }

  if (assignedAgentFilter !== 'all') {
    if (assignedAgentFilter === 'unassigned') {
      filters.assignedAgentId = 'unassigned';
    } else {
      filters.assignedAgentId = assignedAgentFilter;
    }
  }

  if (priorityFilter !== 'all') {
    filters.priority = priorityFilter;
  }

  if (startDate) {
    filters.startDate = startDate;
  }

  if (endDate) {
    filters.endDate = endDate;
  }

  if (debouncedSearch) {
    filters.search = debouncedSearch;
  }

  // Add assignment filter for ADMIN
  if (user?.role === 'ADMIN') {
    if (assignmentFilter === 'assigned') {
      filters.isAssigned = 'true';
    } else if (assignmentFilter === 'unassigned') {
      filters.isAssigned = 'false';
    }
  }

  // PERFORMANCE: Server-side pagination and filtering to handle large datasets efficiently
  const { data, isLoading, error, refetch } = useCases(filters);

  // Fetch agents for filter (ADMIN only)
  const { data: usersData } = useUsers({ role: 'AGENT' }, { enabled: user?.role === 'ADMIN' });

  const bulkOperation = useBulkCaseOperation();
  const exportCases = useExportCases();

  // Translated labels
  const getServiceLabels = (): Record<string, string> => ({
    STUDENT_VISA: t('cases.serviceLabels.STUDENT_VISA'),
    WORK_PERMIT: t('cases.serviceLabels.WORK_PERMIT'),
    FAMILY_REUNIFICATION: t('cases.serviceLabels.FAMILY_REUNIFICATION'),
    TOURIST_VISA: t('cases.serviceLabels.TOURIST_VISA'),
    BUSINESS_VISA: t('cases.serviceLabels.BUSINESS_VISA'),
    PERMANENT_RESIDENCY: t('cases.serviceLabels.PERMANENT_RESIDENCY'),
  });

  const getStatusConfigTranslated = (): Record<string, { label: string; color: string }> => ({
    SUBMITTED: {
      label: t('cases.statusLabels.SUBMITTED'),
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    },
    UNDER_REVIEW: {
      label: t('cases.statusLabels.UNDER_REVIEW'),
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    },
    DOCUMENTS_REQUIRED: {
      label: t('cases.statusLabels.DOCUMENTS_REQUIRED'),
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    },
    PROCESSING: {
      label: t('cases.statusLabels.PROCESSING'),
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    },
    APPROVED: {
      label: t('cases.statusLabels.APPROVED'),
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    },
    REJECTED: {
      label: t('cases.statusLabels.REJECTED'),
      color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    },
    CLOSED: {
      label: t('cases.statusLabels.CLOSED'),
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    },
  });

  const translatedServiceLabels = getServiceLabels();
  const translatedStatusConfig = getStatusConfigTranslated();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Use server-side filtered cases directly
  const cases = data?.cases || [];
  const pagination = data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };
  const totalPages = pagination.totalPages || 1;
  const totalCases = pagination.total || 0;

  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // Get selectable cases (exclude approved cases from bulk operations for non-admin users)
  // ADMIN can select approved cases
  const selectableCases =
    user?.role === 'ADMIN'
      ? cases // ADMIN can select all cases including approved
      : cases.filter((c) => c.status !== 'APPROVED'); // Non-admin cannot select approved cases
  const selectableCaseIds = new Set(selectableCases.map((c) => c.id));

  // Bulk selection handlers
  const handleSelectAll = () => {
    const allSelectableSelected = selectableCases.every((c) => selectedCases.has(c.id));
    if (allSelectableSelected) {
      // Deselect all selectable cases
      const newSelection = new Set(selectedCases);
      selectableCaseIds.forEach((id) => newSelection.delete(id));
      setSelectedCases(newSelection);
    } else {
      // Select all selectable cases
      const newSelection = new Set(selectedCases);
      selectableCaseIds.forEach((id) => newSelection.add(id));
      setSelectedCases(newSelection);
    }
  };

  const handleSelectCase = (caseId: string) => {
    // Prevent selecting approved cases for non-admin users
    const caseItem = cases.find((c) => c.id === caseId);
    if (caseItem?.status === 'APPROVED' && user?.role !== 'ADMIN') {
      return; // Do not allow non-admin to select approved cases
    }

    const newSelection = new Set(selectedCases);
    if (newSelection.has(caseId)) {
      newSelection.delete(caseId);
    } else {
      newSelection.add(caseId);
    }
    setSelectedCases(newSelection);
  };

  const handleBulkAssign = async (agentId: string) => {
    if (selectedCases.size === 0) return;
    // Filter out approved cases for non-admin users before bulk operation
    const validCaseIds =
      user?.role === 'ADMIN'
        ? Array.from(selectedCases) // ADMIN can assign approved cases
        : Array.from(selectedCases).filter((id) => {
            const caseItem = cases.find((c) => c.id === id);
            return caseItem && caseItem.status !== 'APPROVED';
          });

    if (validCaseIds.length === 0) {
      const errorMessage =
        user?.role === 'ADMIN'
          ? t('cases.management.noValidCasesToAssign')
          : t('cases.management.noValidCasesToAssignApproved');
      toast.error(errorMessage);
      return;
    }

    await bulkOperation.mutateAsync({
      operation: 'ASSIGN',
      caseIds: validCaseIds,
      data: { assignedAgentId: agentId },
    });
    setSelectedCases(new Set());
    refetch();
  };

  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedCases.size === 0) return;
    // Filter out approved cases for non-admin users before bulk operation
    const validCaseIds =
      user?.role === 'ADMIN'
        ? Array.from(selectedCases) // ADMIN can update approved cases
        : Array.from(selectedCases).filter((id) => {
            const caseItem = cases.find((c) => c.id === id);
            return caseItem && caseItem.status !== 'APPROVED';
          });

    if (validCaseIds.length === 0) {
      const errorMessage =
        user?.role === 'ADMIN'
          ? t('cases.management.noValidCasesToUpdate')
          : t('cases.management.noValidCasesToUpdateApproved');
      toast.error(errorMessage);
      return;
    }

    await bulkOperation.mutateAsync({
      operation: 'UPDATE_STATUS',
      caseIds: validCaseIds,
      data: { status },
    });
    setSelectedCases(new Set());
    refetch();
  };

  const handleBulkUnassign = async () => {
    if (selectedCases.size === 0) return;
    // Filter out approved cases for non-admin users before bulk operation
    const validCaseIds =
      user?.role === 'ADMIN'
        ? Array.from(selectedCases) // ADMIN can unassign approved cases
        : Array.from(selectedCases).filter((id) => {
            const caseItem = cases.find((c) => c.id === id);
            return caseItem && caseItem.status !== 'APPROVED';
          });

    if (validCaseIds.length === 0) {
      const errorMessage =
        user?.role === 'ADMIN'
          ? t('cases.management.noValidCasesToUnassign')
          : t('cases.management.noValidCasesToUnassignApproved');
      toast.error(errorMessage);
      return;
    }

    await bulkOperation.mutateAsync({
      operation: 'UNASSIGN',
      caseIds: validCaseIds,
    });
    setSelectedCases(new Set());
    refetch();
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    await exportCases.mutateAsync({
      format,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      serviceType: serviceTypeFilter !== 'all' ? serviceTypeFilter : undefined,
      assignedAgentId: assignedAgentFilter !== 'all' ? assignedAgentFilter : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: debouncedSearch || undefined,
    });
  };

  if (isLoading) return <AgentCasesListSkeleton />;
  if (error)
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{t('cases.management.errorLoadingCases')}</p>
      </div>
    );

  if (!user?.id) {
    logger.warn('AgentCasesListEnhanced: user.id is missing');
    return (
      <div className="space-y-6">
        <Card style={{ borderColor: '#ff4538', borderWidth: '1px', borderStyle: 'solid' }}>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 mb-4" style={{ color: '#ff4538' }} />
            <h3 className="text-lg font-semibold mb-2">
              {t('cases.management.couldNotDetermineUser')}
            </h3>
            <p className="text-muted-foreground mb-4">{t('cases.management.refreshOrLogin')}</p>
            <Button asChild variant="default">
              <Link href="/login">{t('cases.management.returnToLogin')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const agents = usersData?.users || [];

  return (
    <TooltipProvider>
      <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight">
              {user.role === 'ADMIN' ? t('cases.allCases') : t('cases.myCases')}
            </h1>
            <p className="text-muted-foreground mt-1 sm:mt-1.5 text-xs sm:text-sm leading-relaxed">
              {user.role === 'ADMIN'
                ? t('cases.management.manageAll')
                : t('cases.management.manageAssigned')}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Tooltip>
              <DropdownMenu>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      className="text-sm text-white border transition-colors hover:opacity-90"
                      style={{
                        backgroundColor: '#361d22',
                        borderColor: '#ff4538',
                        color: 'white',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#4a2a32';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#361d22';
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      <span>{t('cases.management.export')}</span>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>{t('cases.management.exportFormat')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    {t('cases.management.exportCSV')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                    {t('cases.management.exportXLSX')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <TooltipContent>
                <p>{t('cases.management.exportTooltip')}</p>
              </TooltipContent>
            </Tooltip>
            <Badge
              variant="secondary"
              className="text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2 text-white"
              style={{ backgroundColor: '#143240' }}
            >
              {totalCases}{' '}
              <span className="hidden sm:inline">
                {totalCases === 1 ? t('cases.management.case') : t('cases.management.cases')}
              </span>
            </Badge>
          </div>
        </div>

        {/* Filters Card */}
        <Card
          className="overflow-visible"
          style={{ borderColor: '#ff4538', borderWidth: '1px', borderStyle: 'solid' }}
        >
          <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6 overflow-visible">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {/* Search */}
              <div className="relative sm:col-span-2 lg:col-span-2">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5"
                  style={{ color: '#ff4538' }}
                />
                <Input
                  placeholder={t('cases.management.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleFilterChange();
                  }}
                  className="pl-9 sm:pl-10 text-base h-10 sm:h-11"
                />
              </div>

              {/* Service Type */}
              <Select
                value={serviceTypeFilter}
                onValueChange={(value) => {
                  setServiceTypeFilter(value);
                  handleFilterChange();
                }}
              >
                <SelectTrigger className="text-base h-10 sm:h-11">
                  <SelectValue placeholder={t('cases.management.serviceType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('cases.management.allServices')}</SelectItem>
                  {Object.entries(translatedServiceLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status */}
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  handleFilterChange();
                }}
              >
                <SelectTrigger className="text-base h-10 sm:h-11">
                  <SelectValue placeholder={t('cases.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('cases.management.activeCases')}</SelectItem>
                  <SelectItem value="all">{t('cases.management.allStatus')}</SelectItem>
                  <SelectItem value="SUBMITTED">{t('cases.statusLabels.SUBMITTED')}</SelectItem>
                  <SelectItem value="UNDER_REVIEW">
                    {t('cases.statusLabels.UNDER_REVIEW')}
                  </SelectItem>
                  <SelectItem value="DOCUMENTS_REQUIRED">
                    {t('cases.statusLabels.DOCUMENTS_REQUIRED')}
                  </SelectItem>
                  <SelectItem value="PROCESSING">{t('cases.statusLabels.PROCESSING')}</SelectItem>
                  <SelectItem value="APPROVED">{t('cases.statusLabels.APPROVED')}</SelectItem>
                  <SelectItem value="REJECTED">{t('cases.statusLabels.REJECTED')}</SelectItem>
                </SelectContent>
              </Select>

              {/* Assigned Agent (ADMIN only) */}
              {user.role === 'ADMIN' && (
                <Select
                  value={assignedAgentFilter}
                  onValueChange={(value) => {
                    setAssignedAgentFilter(value);
                    handleFilterChange();
                  }}
                >
                  <SelectTrigger className="text-base h-10 sm:h-11">
                    <SelectValue placeholder={t('cases.management.assignedAgent')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('cases.management.allAgents')}</SelectItem>
                    <SelectItem value="unassigned">{t('cases.management.unassigned')}</SelectItem>
                    {agents.map((agent: any) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.firstName} {agent.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Priority */}
              <Select
                value={priorityFilter}
                onValueChange={(value) => {
                  setPriorityFilter(value);
                  handleFilterChange();
                }}
              >
                <SelectTrigger className="text-base h-10 sm:h-11">
                  <SelectValue placeholder={t('cases.priority')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('cases.management.allPriority')}</SelectItem>
                  <SelectItem value="URGENT">{t('cases.priorityLabels.URGENT')}</SelectItem>
                  <SelectItem value="HIGH">{t('cases.priorityLabels.HIGH')}</SelectItem>
                  <SelectItem value="NORMAL">{t('cases.priorityLabels.NORMAL')}</SelectItem>
                  <SelectItem value="LOW">{t('cases.priorityLabels.LOW')}</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Range - Start Date */}
              <div className="relative w-full overflow-visible">
                <Input
                  type="date"
                  placeholder={t('cases.management.startDate')}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    handleFilterChange();
                  }}
                  className="text-base h-10 sm:h-11 w-full"
                />
              </div>
              {/* Date Range - End Date */}
              <div className="relative w-full overflow-visible">
                <Input
                  type="date"
                  placeholder={t('cases.management.endDate')}
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    handleFilterChange();
                  }}
                  className="text-base h-10 sm:h-11 w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions Bar (ADMIN ONLY - Agents cannot assign/unassign cases) */}
        {user.role === 'ADMIN' && selectedCases.size > 0 && (
          <Card
            style={{
              borderColor: '#ff4538',
              borderWidth: '1px',
              borderStyle: 'solid',
              backgroundColor: 'rgba(255, 69, 56, 0.1)',
            }}
          >
            <CardContent className="py-3 sm:py-4 px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-4">
                  <CheckSquare
                    className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0"
                    style={{ color: '#ff4538' }}
                  />
                  <span className="font-medium text-sm sm:text-base">
                    {selectedCases.size}{' '}
                    {selectedCases.size !== 1
                      ? t('cases.management.casesSelected')
                      : t('cases.management.caseSelected')}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCases(new Set())}
                        className="text-sm"
                      >
                        <XSquare className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="text-xs sm:text-sm">{t('cases.management.clear')}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('cases.management.clearSelection')}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex gap-2 flex-wrap w-full sm:w-auto">
                  <Tooltip>
                    <DropdownMenu>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="text-sm">
                            <UserPlus className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span className="text-xs sm:text-sm">
                              {t('cases.management.bulkAssign')}
                            </span>
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>{t('cases.management.assignToAgent')}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {agents.map((agent: any) => (
                          <DropdownMenuItem
                            key={agent.id}
                            onClick={() => handleBulkAssign(agent.id)}
                          >
                            {agent.firstName} {agent.lastName}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <TooltipContent>
                      <p>{t('cases.management.assignSelectedCases')}</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <DropdownMenu>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="text-sm">
                            <Filter className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span className="text-xs sm:text-sm">
                              {t('cases.management.bulkStatus')}
                            </span>
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>{t('cases.management.updateStatus')}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {Object.entries(translatedStatusConfig).map(([key, config]) => (
                          <DropdownMenuItem key={key} onClick={() => handleBulkStatusUpdate(key)}>
                            {config.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <TooltipContent>
                      <p>{t('cases.management.updateStatusSelected')}</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkUnassign}
                        className="text-sm"
                      >
                        <XSquare className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="text-xs sm:text-sm">
                          {t('cases.management.bulkUnassign')}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('cases.management.unassignSelectedCases')}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {cases.length === 0 ? (
          <Card style={{ borderColor: '#ff4538', borderWidth: '1px', borderStyle: 'solid' }}>
            <CardContent className="py-12 text-center">
              <Briefcase className="mx-auto h-12 w-12 mb-4" style={{ color: '#ff4538' }} />
              <h3 className="text-lg font-semibold mb-2">{t('cases.management.noCasesFound')}</h3>
              <p className="text-muted-foreground">{t('cases.management.noMatchingFilters')}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Cases Table - Mobile Responsive with Horizontal Scroll */}
            <div className="w-full overflow-x-auto">
              <Card style={{ borderColor: '#ff4538', borderWidth: '1px', borderStyle: 'solid' }}>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          {user.role === 'ADMIN' && (
                            <th className="px-2 sm:px-3 py-3 text-left">
                              <Checkbox
                                checked={
                                  selectableCases.length > 0 &&
                                  selectableCases.every((c) => selectedCases.has(c.id))
                                }
                                onCheckedChange={handleSelectAll}
                                disabled={selectableCases.length === 0}
                              />
                            </th>
                          )}
                          <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {t('cases.table.reference')}
                          </th>
                          <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {t('cases.table.customer')}
                          </th>
                          <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {t('cases.table.serviceType')}
                          </th>
                          <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {t('cases.table.status')}
                          </th>
                          <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {t('cases.table.date')}
                          </th>
                          <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {t('cases.table.assignedAgent')}
                          </th>
                          <th className="px-3 sm:px-4 lg:px-6 py-3 text-right text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {t('cases.table.actions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {cases.map((c) => (
                          <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            {user.role === 'ADMIN' && (
                              <td className="px-2 sm:px-3 py-3 sm:py-4">
                                <Checkbox
                                  checked={selectedCases.has(c.id)}
                                  onCheckedChange={() => handleSelectCase(c.id)}
                                  disabled={c.status === 'APPROVED' && user?.role !== 'ADMIN'}
                                  title={
                                    c.status === 'APPROVED' && user?.role !== 'ADMIN'
                                      ? t('cases.management.approvedCasesCannotBeSelected')
                                      : undefined
                                  }
                                />
                              </td>
                            )}
                            <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Briefcase className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary mr-1.5 sm:mr-2 flex-shrink-0" />
                                <span className="text-sm sm:text-base font-medium">
                                  {c.referenceNumber}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                              <div className="text-sm sm:text-base">
                                <div className="font-medium">
                                  {c.client?.firstName} {c.client?.lastName}
                                </div>
                                <div className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                                  {c.client?.email}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                              <span className="text-sm sm:text-base">
                                {translatedServiceLabels[c.serviceType] || c.serviceType}
                              </span>
                            </td>
                            <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                              <div className="flex flex-col gap-1 min-w-0">
                                <Badge
                                  className={cn(
                                    translatedStatusConfig[c.status]?.color || '',
                                    'w-fit text-xs sm:text-sm'
                                  )}
                                >
                                  {translatedStatusConfig[c.status]?.label || c.status}
                                </Badge>
                                {c.appointments &&
                                  c.appointments.length > 0 &&
                                  c.appointments.some(
                                    (apt) =>
                                      apt.status === 'SCHEDULED' || apt.status === 'RESCHEDULED'
                                  ) && (
                                    <Badge
                                      className="text-xs w-fit whitespace-nowrap"
                                      style={{
                                        backgroundColor: '#ff4538',
                                        color: 'white',
                                        border: 'none',
                                      }}
                                    >
                                      <Calendar className="h-3 w-3 mr-1 inline" />
                                      {t('cases.management.appointmentScheduled')}
                                    </Badge>
                                  )}
                              </div>
                            </td>
                            <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-sm sm:text-base text-gray-500 dark:text-gray-400">
                              {new Date(c.submissionDate).toLocaleDateString()}
                            </td>
                            <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                              {c.assignedAgent ? (
                                <div className="text-sm sm:text-base">
                                  {c.assignedAgent.firstName} {c.assignedAgent.lastName}
                                </div>
                              ) : (
                                <span className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">
                                  {t('cases.table.unassigned')}
                                </span>
                              )}
                            </td>
                            <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                              <div className="flex justify-end gap-1 sm:gap-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      asChild
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                                    >
                                      <Link href={`/dashboard/cases/${c.id}`}>
                                        <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                      </Link>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t('cases.management.viewEditCaseDetails')}</p>
                                  </TooltipContent>
                                </Tooltip>

                                {user.role === 'ADMIN' && !c.assignedAgentId && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedCaseForAssignment(c);
                                          setAssignDialogOpen(true);
                                        }}
                                        className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                                      >
                                        <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{t('cases.management.assignCaseToAgent')}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Card style={{ borderColor: '#ff4538', borderWidth: '1px', borderStyle: 'solid' }}>
                <CardContent className="py-3 sm:py-4 px-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                    <div className="text-sm sm:text-base text-muted-foreground">
                      {t('cases.management.showing')} {(currentPage - 1) * itemsPerPage + 1}-
                      {Math.min(currentPage * itemsPerPage, totalCases)} {t('cases.management.of')}{' '}
                      {totalCases}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="text-sm h-9 sm:h-10"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1">
                          {t('cases.management.previous')}
                        </span>
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter((page) => {
                            return (
                              page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1
                            );
                          })
                          .map((page, index, array) => (
                            <div key={page} className="flex items-center">
                              {index > 0 && array[index - 1] !== page - 1 && (
                                <span className="px-1 sm:px-2 text-sm text-muted-foreground">
                                  ...
                                </span>
                              )}
                              <Button
                                variant={currentPage === page ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className="h-8 w-8 sm:h-9 sm:w-9 p-0 text-sm sm:text-base text-white"
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
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="text-sm h-9 sm:h-10"
                      >
                        <span className="hidden sm:inline mr-1">{t('cases.management.next')}</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Assign Case Dialog */}
        {selectedCaseForAssignment && (
          <AssignCaseDialog
            caseData={selectedCaseForAssignment}
            open={assignDialogOpen}
            onOpenChange={(open) => {
              setAssignDialogOpen(open);
              if (!open) setSelectedCaseForAssignment(null);
            }}
            onSuccess={() => {
              refetch();
              setSelectedCaseForAssignment(null);
            }}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

export function AgentCasesListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-5 w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-10 lg:col-span-2" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
