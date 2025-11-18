'use client';

import { memo, useMemo } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { useCases } from '@/features/cases/api';
import { Case } from '@/features/cases/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
  FileCheck,
  AlertCircle,
  Mail,
} from 'lucide-react';
import Link from 'next/link';
import { StatCardPlaceholder, ListItemPlaceholder } from '@/components/ui/progressive-placeholder';
import { SimpleSkeleton, SkeletonText } from '@/components/ui/simple-skeleton';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

export const AgentDashboard = memo(function AgentDashboard() {
  const { user } = useAuthStore();
  const { t } = useTranslation();

  // PERFORMANCE: Add caching and prevent refetch for instant navigation
  const { data: casesData, isLoading } = useCases(
    {},
    {
      staleTime: 60000, // Cache for 60 seconds
      gcTime: 600000, // Keep in cache for 10 minutes
      refetchOnMount: false, // Use cached data
      refetchOnWindowFocus: false, // Don't refetch on tab switch
    }
  );

  const cases: Case[] = casesData?.cases || [];

  // For ADMIN: show all cases. For AGENT: show only assigned cases
  const assignedCases = useMemo(() => {
    if (!user?.id || !cases.length) return [];

    // ADMIN sees all cases in the system
    if (user.role === 'ADMIN') {
      return cases;
    }

    // AGENT sees only their assigned cases
    return cases.filter((c: Case) => {
      const assignedId = c.assignedAgentId;
      return assignedId && assignedId === user.id;
    });
  }, [cases, user?.id, user?.role]);

  // IMPORTANT: All hooks must be called BEFORE any conditional returns
  const activeAssigned = useMemo(() => {
    return assignedCases.filter((c: Case) => {
      const status = String(c.status || '').toUpperCase();
      return !['APPROVED', 'REJECTED', 'CLOSED'].includes(status);
    });
  }, [assignedCases]);

  const completedThisMonth = useMemo(() => {
    return assignedCases.filter((c: Case) => {
      // Check status more robustly
      const status = String(c.status || '').toUpperCase();
      if (status !== 'APPROVED') return false;

      // Use lastUpdated as completion timestamp
      const completionTimestamp = c.lastUpdated;
      if (!completionTimestamp) return false;

      const completedDate = new Date(completionTimestamp);
      // Guard against invalid dates
      if (isNaN(completedDate.getTime())) return false;

      const now = new Date();
      return (
        completedDate.getMonth() === now.getMonth() &&
        completedDate.getFullYear() === now.getFullYear()
      );
    });
  }, [assignedCases]);

  // Calculate documents requiring verification (PENDING status)
  const documentsToVerify = useMemo(() => {
    return assignedCases.reduce((count: number, c: Case) => {
      if (c.documents && Array.isArray(c.documents)) {
        return count + c.documents.filter((doc) => doc.status === 'PENDING').length;
      }
      return count;
    }, 0);
  }, [assignedCases]);

  // Calculate average response time
  const responseTime = useMemo(() => {
    // Filter cases that have been updated after submission (excluding just-submitted cases)
    const processedCases = assignedCases.filter((c: Case) => {
      if (!c.submissionDate || !c.lastUpdated) return false;

      const submitted = new Date(c.submissionDate);
      const updated = new Date(c.lastUpdated);

      // Guard against invalid dates
      if (isNaN(submitted.getTime()) || isNaN(updated.getTime())) return false;

      return updated.getTime() - submitted.getTime() > 60000; // More than 1 minute difference
    });

    if (processedCases.length === 0) return 'N/A';

    // Calculate average time difference in milliseconds
    const totalResponseTime = processedCases.reduce((total: number, c: Case) => {
      const submitted = new Date(c.submissionDate);
      const updated = new Date(c.lastUpdated);
      return total + (updated.getTime() - submitted.getTime());
    }, 0);

    const avgResponseTimeMs = totalResponseTime / processedCases.length;
    const avgResponseTimeHours = avgResponseTimeMs / (1000 * 60 * 60);

    // Format the response time
    if (avgResponseTimeHours < 1) {
      const minutes = Math.round(avgResponseTimeMs / (1000 * 60));
      return `${minutes} min${minutes !== 1 ? 's' : ''}`;
    } else if (avgResponseTimeHours < 24) {
      return `${avgResponseTimeHours.toFixed(1)} hrs`;
    } else {
      const days = avgResponseTimeHours / 24;
      return `${days.toFixed(1)} days`;
    }
  }, [assignedCases]);

  const stats = useMemo(() => {
    const pendingReviewCount = assignedCases.filter((c: Case) => {
      const status = String(c.status || '').toUpperCase();
      return status === 'UNDER_REVIEW' || status === 'UNDERREVIEW';
    }).length;

    return {
      assignedCases: assignedCases.length,
      activeCases: activeAssigned.length,
      completedThisMonth: completedThisMonth.length,
      pendingReview: pendingReviewCount,
      documentsToVerify,
      responseTime,
    };
  }, [assignedCases, activeAssigned, completedThisMonth, documentsToVerify, responseTime]);

  // PERFORMANCE: Only show skeleton if NO data is cached (first load)
  // NOW safe to do conditional returns after all hooks have been called
  const isFirstLoad = isLoading && !casesData;
  if (isFirstLoad) return <AgentDashboardSkeleton />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight">
          {t('dashboard.admin.welcomeBack', { name: user?.firstName })}
        </h1>
        <p className="text-xs sm:text-sm text-white/70 mt-1 sm:mt-1.5 leading-relaxed">
          {user?.role === 'ADMIN'
            ? t('dashboard.admin.dashboardOverview')
            : t('dashboard.admin.casesOverview')}
        </p>
      </div>

      <div className="grid gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-2 sm:p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] sm:text-xs font-medium text-muted-foreground leading-tight">
              {user?.role === 'ADMIN'
                ? t('dashboard.admin.allCases')
                : t('dashboard.admin.assignedCases')}
            </span>
            <Briefcase
              className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0"
              style={{ color: '#ff4538' }}
            />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg sm:text-xl md:text-2xl font-bold leading-none">
              {stats.assignedCases}
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
              {stats.activeCases} {t('dashboard.activeCases').toLowerCase()}
            </span>
          </div>
        </Card>
        <Card className="p-2 sm:p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] sm:text-xs font-medium text-muted-foreground leading-tight">
              {user?.role === 'ADMIN'
                ? t('dashboard.admin.underReview')
                : t('dashboard.admin.pendingReview')}
            </span>
            <Clock
              className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0"
              style={{ color: '#ff4538' }}
            />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg sm:text-xl md:text-2xl font-bold leading-none">
              {stats.pendingReview}
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
              {t('dashboard.admin.requireAttention')}
            </span>
          </div>
        </Card>
        <Card className="p-2 sm:p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] sm:text-xs font-medium text-muted-foreground leading-tight">
              {t('dashboard.admin.completed')}
            </span>
            <CheckCircle2
              className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0"
              style={{ color: '#ff4538' }}
            />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg sm:text-xl md:text-2xl font-bold leading-none">
              {stats.completedThisMonth}
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
              {t('dashboard.admin.thisMonth')}
            </span>
          </div>
        </Card>
        <Card className="p-2 sm:p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] sm:text-xs font-medium text-muted-foreground leading-tight">
              {t('dashboard.admin.responseTime')}
            </span>
            <TrendingUp
              className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0"
              style={{ color: '#ff4538' }}
            />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg sm:text-xl md:text-2xl font-bold leading-none">
              {stats.responseTime}
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
              {t('dashboard.admin.average')}
            </span>
          </div>
        </Card>
      </div>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-full md:col-span-4 lg:col-span-4">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base font-semibold">
              {t('dashboard.admin.recentCases')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-1.5 sm:space-y-2">
            {activeAssigned.slice(0, 5).map((c: Case) => (
              <div
                key={c.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-1.5"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Briefcase
                    className="h-4 w-4 text-primary flex-shrink-0"
                    style={{ color: '#ff4538' }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium truncate">{c.referenceNumber}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                      {c.client?.firstName} {c.client?.lastName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                  <Badge variant="outline" className="text-[10px] sm:text-xs">
                    {c.status.replace(/_/g, ' ')}
                  </Badge>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-6 sm:h-7 text-[10px] sm:text-xs px-2 sm:px-3"
                  >
                    <Link href={`/dashboard/cases/${c.id}`}>{t('dashboard.admin.review')}</Link>
                  </Button>
                </div>
              </div>
            ))}
            {activeAssigned.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Briefcase className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">
                  {user?.role === 'ADMIN'
                    ? t('dashboard.admin.noActiveCases')
                    : t('dashboard.admin.noActiveCasesAssigned')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-full md:col-span-2 lg:col-span-3">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base font-semibold">
              {t('dashboard.admin.quickActions')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-1.5">
            <Button
              asChild
              className="w-full justify-start h-7 sm:h-8 text-xs sm:text-sm"
              variant="outline"
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
              <Link href="/dashboard/cases" className="flex items-center">
                <Briefcase
                  className="mr-2 h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0"
                  style={{ color: '#ff4538' }}
                />
                <span className="truncate">
                  {user?.role === 'ADMIN' ? t('dashboard.admin.allCases') : t('cases.myCases')}
                </span>
              </Link>
            </Button>
            <Button
              asChild
              className="w-full justify-start h-7 sm:h-8 text-xs sm:text-sm"
              variant="outline"
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
              <Link href="/dashboard/documents" className="flex items-center">
                <FileCheck
                  className="mr-2 h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0"
                  style={{ color: '#ff4538' }}
                />
                <span className="truncate">
                  {user?.role === 'ADMIN'
                    ? t('dashboard.admin.allDocuments')
                    : t('dashboard.admin.reviewDocuments')}
                </span>
              </Link>
            </Button>
            <Button
              asChild
              className="w-full justify-start h-7 sm:h-8 text-xs sm:text-sm"
              variant="outline"
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
              <Link href="/dashboard/clients" className="flex items-center">
                <Users
                  className="mr-2 h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0"
                  style={{ color: '#ff4538' }}
                />
                <span className="truncate">
                  {user?.role === 'ADMIN'
                    ? t('dashboard.admin.allClients')
                    : t('dashboard.admin.myClients')}
                </span>
              </Link>
            </Button>
            <Button
              asChild
              className="w-full justify-start h-7 sm:h-8 text-xs sm:text-sm"
              variant="outline"
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
              <Link href="/dashboard/messages" className="flex items-center">
                <AlertCircle
                  className="mr-2 h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0"
                  style={{ color: '#ff4538' }}
                />
                <span className="truncate">
                  {user?.role === 'ADMIN'
                    ? t('dashboard.admin.allMessages')
                    : t('dashboard.admin.urgentMessages')}
                </span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

/**
 * PERFORMANCE OPTIMIZED: Progressive skeleton with real structure
 * - Shows stat cards immediately with placeholder values
 * - Better perceived performance than empty skeletons
 * - Mobile-optimized for instant display
 */
export function AgentDashboardSkeleton() {
  const { t } = useTranslation();
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <SkeletonText size="xl" className="w-64" />
        <SkeletonText size="sm" className="w-96" />
      </div>

      {/* Stat Cards with Progressive Placeholders */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCardPlaceholder title={t('dashboard.admin.assignedCases')} icon={Briefcase} />
        <StatCardPlaceholder title={t('dashboard.admin.pendingReview')} icon={Clock} />
        <StatCardPlaceholder
          title={`${t('dashboard.admin.completed')} (${t('dashboard.admin.thisMonth')})`}
          icon={CheckCircle2}
        />
        <StatCardPlaceholder title={t('dashboard.admin.responseTime')} icon={TrendingUp} />
      </div>

      {/* Content Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Cases Card */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>{t('dashboard.admin.recentCases')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <ListItemPlaceholder key={i} showBadge showActions />
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>{t('dashboard.admin.quickActions')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <SimpleSkeleton key={i} className="h-10 w-full rounded" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
