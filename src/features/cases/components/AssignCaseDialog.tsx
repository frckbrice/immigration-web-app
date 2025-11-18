'use client';

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUsers } from '@/features/users/api';
import { useCases } from '@/features/cases/api';
import { useAssignCase } from '../api/mutations';
import { useAuthStore } from '@/features/auth/store';
import type { Case } from '../types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { UserCheck, AlertCircle, CheckCircle, TrendingUp, RefreshCw } from 'lucide-react';
import { getInitials } from '@/lib/utils/helpers';
import { toast } from 'sonner';

// Maximum number of active cases an agent can handle concurrently
const MAX_ACTIVE_CASES_PER_AGENT = 20;

interface AssignCaseDialogProps {
  caseData: Case;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AssignCaseDialog({
  caseData,
  open,
  onOpenChange,
  onSuccess,
}: AssignCaseDialogProps) {
  const { t } = useTranslation();
  const { user, isLoading: isAuthLoading, accessToken } = useAuthStore();
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  // SECURITY FIX: Only fetch if dialog is open and user is ADMIN/AGENT with valid token
  const { data: usersData, isLoading: isLoadingUsers } = useUsers(
    { role: 'AGENT' },
    {
      enabled:
        open &&
        !isAuthLoading &&
        !!user &&
        !!accessToken &&
        (user.role === 'ADMIN' || user.role === 'AGENT'),
    }
  );
  const { data: casesData, isLoading: isLoadingCases } = useCases({});
  const assignCase = useAssignCase();

  const agents = usersData?.users || [];
  const allCases = casesData?.cases || [];

  // Calculate agent workload and availability
  const agentsWithMetrics = useMemo(() => {
    return agents.map((agent: any) => {
      const assignedCases = allCases.filter((c: any) => c.assignedAgentId === agent.id);
      const activeCases = assignedCases.filter(
        (c: any) => !['APPROVED', 'REJECTED', 'CLOSED'].includes(c.status)
      );

      // Calculate capacity using MAX_ACTIVE_CASES_PER_AGENT
      const maxCapacity = MAX_ACTIVE_CASES_PER_AGENT;
      const currentLoad = activeCases.length;
      const utilizationRate = (currentLoad / maxCapacity) * 100;
      const availableCapacity = maxCapacity - currentLoad;
      const isAvailable = availableCapacity > 0;

      // Calculate success metrics
      const completedCases = assignedCases.filter((c: any) => c.status === 'APPROVED');
      const approvalRate =
        assignedCases.length > 0
          ? Math.round((completedCases.length / assignedCases.length) * 100)
          : 0;

      return {
        ...agent,
        metrics: {
          activeCases: currentLoad,
          maxCapacity,
          utilizationRate,
          availableCapacity,
          isAvailable,
          approvalRate,
          totalCases: assignedCases.length,
        },
      };
    });
  }, [agents, allCases]);

  // Sort agents by availability (most available first)
  const sortedAgents = useMemo(() => {
    return [...agentsWithMetrics].sort((a, b) => {
      // First: available agents
      if (a.metrics.isAvailable !== b.metrics.isAvailable) {
        return a.metrics.isAvailable ? -1 : 1;
      }
      // Second: by available capacity (more capacity first)
      if (a.metrics.availableCapacity !== b.metrics.availableCapacity) {
        return b.metrics.availableCapacity - a.metrics.availableCapacity;
      }
      // Third: by approval rate (higher is better)
      return b.metrics.approvalRate - a.metrics.approvalRate;
    });
  }, [agentsWithMetrics]);

  const selectedAgent = sortedAgents.find((a) => a.id === selectedAgentId);

  const handleAssign = async () => {
    if (!selectedAgentId) {
      toast.error(t('cases.dialogs.assignCase.pleaseSelectAgent'));
      return;
    }

    try {
      await assignCase.mutateAsync({
        caseId: caseData.id,
        agentId: selectedAgentId,
      });

      toast.success(t('cases.dialogs.assignCase.assignedSuccessfully'));
      setSelectedAgentId('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      // Error is handled in mutation
    }
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 90) return 'text-red-600 dark:text-red-400';
    if (rate >= 70) return 'text-orange-600 dark:text-orange-400';
    if (rate >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getAvailabilityBadge = (agent: any) => {
    if (!agent.metrics.isAvailable) {
      return <Badge variant="destructive">{t('cases.dialogs.assignCase.atCapacity')}</Badge>;
    }
    if (agent.metrics.utilizationRate >= 80) {
      return <Badge variant="secondary">{t('cases.dialogs.assignCase.limited')}</Badge>;
    }
    return <Badge variant="default">{t('cases.dialogs.assignCase.availableBadge')}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[95vh] overflow-y-auto sm:max-h-[90vh] w-[95vw] sm:w-full"
        style={{ borderColor: '#ff4538', borderWidth: '1px', borderStyle: 'solid' }}
      >
        <DialogHeader className="pb-2 sm:pb-3">
          <DialogTitle className="text-base sm:text-lg font-semibold leading-tight flex items-center gap-2">
            <UserCheck className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: '#ff4538' }} />
            {t('cases.dialogs.assignCase.title')}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm leading-relaxed">
            {t('cases.dialogs.assignCase.description')}
          </DialogDescription>
        </DialogHeader>

        {/* Current Case Info */}
        <div
          className="rounded-lg border p-3 sm:p-4 bg-muted/50 space-y-2 sm:space-y-3"
          style={{ borderColor: 'rgba(255, 69, 56, 0.2)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium break-words">
                {t('cases.dialogs.assignCase.case')}: {caseData.referenceNumber}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground break-words">
                {t('cases.dialogs.assignCase.client')}: {caseData.client?.firstName}{' '}
                {caseData.client?.lastName}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground break-words">
                {t('cases.dialogs.assignCase.service')}: {caseData.serviceType.replace(/_/g, ' ')}
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] sm:text-xs w-fit">
              {caseData.status}
            </Badge>
          </div>
        </div>

        {/* Agent Selection */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agent-select">{t('cases.dialogs.assignCase.selectAgent')}</Label>
            {isLoadingUsers || isLoadingCases ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger id="agent-select">
                    <SelectValue placeholder={t('cases.dialogs.assignCase.chooseAgent')} />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedAgents.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {t('cases.dialogs.assignCase.noAgentsAvailable')}
                      </div>
                    ) : (
                      sortedAgents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>
                              {agent.firstName} {agent.lastName}
                            </span>
                            <span className="ml-2">
                              ({agent.metrics.activeCases}/{agent.metrics.maxCapacity} cases)
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                {/* Agent Preview */}
                {selectedAgent && (
                  <div className="rounded-lg border p-4 space-y-3 bg-background">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>
                          {getInitials(`${selectedAgent.firstName} ${selectedAgent.lastName}`)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">
                              {selectedAgent.firstName} {selectedAgent.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">{selectedAgent.email}</p>
                          </div>
                          {getAvailabilityBadge(selectedAgent)}
                        </div>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-4 pt-2">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          {t('cases.dialogs.assignCase.workload')}
                        </p>
                        <p
                          className={`text-lg font-bold ${getUtilizationColor(selectedAgent.metrics.utilizationRate)}`}
                        >
                          {selectedAgent.metrics.utilizationRate.toFixed(0)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedAgent.metrics.activeCases} {t('cases.dialogs.assignCase.active')}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          {t('cases.dialogs.assignCase.available')}
                        </p>
                        <p className="text-lg font-bold">
                          {selectedAgent.metrics.availableCapacity}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('cases.dialogs.assignCase.slotsOpen')}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          {t('cases.dialogs.assignCase.successRate')}
                        </p>
                        <p className="text-lg font-bold">{selectedAgent.metrics.approvalRate}%</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedAgent.metrics.totalCases} {t('cases.dialogs.assignCase.total')}
                        </p>
                      </div>
                    </div>

                    {/* Availability Indicator */}
                    <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50">
                      {selectedAgent.metrics.isAvailable ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            <p className="font-medium">
                              {t('cases.dialogs.assignCase.agentAvailable')}
                            </p>
                            <p className="text-muted-foreground">
                              {t('cases.dialogs.assignCase.canHandle', {
                                count: selectedAgent.metrics.availableCapacity,
                              })}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            <p className="font-medium">
                              {t('cases.dialogs.assignCase.agentAtCapacity')}
                            </p>
                            <p className="text-muted-foreground">
                              {t('cases.dialogs.assignCase.currentlyHandling', {
                                count: selectedAgent.metrics.activeCases,
                              })}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Helper Text */}
          {!isLoadingUsers && !isLoadingCases && sortedAgents.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-950/20 text-sm">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  {t('cases.dialogs.assignCase.smartSortingEnabled')}
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  {t('cases.dialogs.assignCase.smartSortingDescription')}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedAgentId('');
              onOpenChange(false);
            }}
            disabled={assignCase.isPending}
            className="w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-9"
            style={{
              backgroundColor: 'transparent',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: '1px',
              borderStyle: 'solid',
              color: 'inherit',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 69, 56, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            {t('cases.dialogs.assignCase.cancel')}
          </Button>
          <Button
            onClick={handleAssign}
            disabled={
              !selectedAgentId || assignCase.isPending || !selectedAgent?.metrics.isAvailable
            }
            className="w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-9"
            style={{
              backgroundColor: '#361d22',
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
            {assignCase.isPending ? (
              <>
                <RefreshCw
                  className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin"
                  style={{ color: '#ff4538' }}
                />
                {t('cases.dialogs.assignCase.assigning')}
              </>
            ) : (
              <>
                <UserCheck
                  className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4"
                  style={{ color: '#ff4538' }}
                />
                {t('cases.dialogs.assignCase.assignCase')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
