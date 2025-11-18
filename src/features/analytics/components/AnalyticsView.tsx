'use client';

import { useAuthStore } from '@/features/auth/store';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useCases } from '@/features/cases/api';
import { Case } from '@/features/cases/types';
import { BarChart3, TrendingUp, FileCheck, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export function AnalyticsView() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { t } = useTranslation();
  const { data, isLoading } = useCases({});

  useEffect(() => {
    // Only ADMIN and AGENT can access this page
    if (user && !['ADMIN', 'AGENT'].includes(user.role)) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const cases: Case[] = data?.cases || [];
  const totalCases = cases.length;
  const activeCases = cases.filter(
    (c: Case) => !['APPROVED', 'REJECTED', 'CLOSED'].includes(c.status)
  ).length;
  const approvedCases = cases.filter((c: Case) => c.status === 'APPROVED').length;
  const successRate = totalCases > 0 ? Math.round((approvedCases / totalCases) * 100) : 0;

  // Calculate analytics data for charts
  const statusData = useMemo(() => {
    const statusCounts = cases.reduce(
      (acc, c) => {
        const status = c.status || 'UNKNOWN';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.replace(/_/g, ' '),
      value: count,
    }));
  }, [cases]);

  const serviceTypeData = useMemo(() => {
    const typeCounts = cases.reduce(
      (acc, c) => {
        const type = c.serviceType || 'UNKNOWN';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(typeCounts).map(([type, count]) => ({
      name: type.replace(/_/g, ' '),
      value: count,
    }));
  }, [cases]);

  const monthlyTrends = useMemo(() => {
    const monthCounts: Record<string, number> = {};

    cases.forEach((c) => {
      const date = new Date(c.submissionDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
    });

    return Object.entries(monthCounts)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6); // Last 6 months
  }, [cases]);

  // Guards placed after hooks to satisfy rules-of-hooks
  if (user && !['ADMIN', 'AGENT'].includes(user.role)) {
    return null;
  }

  if (isLoading) {
    return <AnalyticsViewSkeleton />;
  }

  const stats = [
    {
      label: t('analytics.totalCases'),
      value: totalCases.toString(),
      icon: BarChart3,
      description: t('analytics.totalCasesDescription'),
    },
    {
      label: t('analytics.activeCases'),
      value: activeCases.toString(),
      icon: TrendingUp,
      description: t('analytics.activeCasesDescription'),
    },
    {
      label: t('analytics.approvedCases'),
      value: approvedCases.toString(),
      icon: FileCheck,
      description: t('analytics.approvedCasesDescription'),
    },
    {
      label: t('analytics.successRate'),
      value: `${successRate}%`,
      icon: Target,
      description: t('analytics.successRateDescription'),
    },
  ];

  // Color palette for charts
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('analytics.title')}</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
          {t('analytics.description')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="p-3 sm:p-4"
              style={{ borderColor: '#ff4538', borderWidth: '1px', borderStyle: 'solid' }}
            >
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <span className="text-xs font-medium text-muted-foreground truncate flex-1 pr-1">
                  {stat.label}
                </span>
                <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" style={{ color: '#ff4538' }} />
              </div>
              <div className="flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-xl sm:text-2xl font-bold">{stat.value}</span>
                <span className="text-xs text-muted-foreground truncate">{stat.description}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <Tabs defaultValue="status" className="space-y-3 sm:space-y-4">
        <TabsList className="w-full sm:w-auto bg-transparent p-0 gap-2 h-auto border-0">
          <TabsTrigger
            value="status"
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-md transition-all text-muted-foreground border hover:border-white/20 data-[state=active]:!bg-[#361d22] data-[state=active]:!text-white data-[state=active]:!border-[#ff4538] data-[state=active]:hover:border-[#ff4538]"
            style={{
              backgroundColor: 'transparent',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: '1px',
              borderStyle: 'solid',
            }}
          >
            {t('analytics.byStatus')}
          </TabsTrigger>
          <TabsTrigger
            value="trends"
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-md transition-all text-muted-foreground border hover:border-white/20 data-[state=active]:!bg-[#361d22] data-[state=active]:!text-white data-[state=active]:!border-[#ff4538] data-[state=active]:hover:border-[#ff4538]"
            style={{
              backgroundColor: 'transparent',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: '1px',
              borderStyle: 'solid',
            }}
          >
            {t('analytics.monthlyTrends')}
          </TabsTrigger>
          <TabsTrigger
            value="types"
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-md transition-all text-muted-foreground border hover:border-white/20 data-[state=active]:!bg-[#361d22] data-[state=active]:!text-white data-[state=active]:!border-[#ff4538] data-[state=active]:hover:border-[#ff4538]"
            style={{
              backgroundColor: 'transparent',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: '1px',
              borderStyle: 'solid',
            }}
          >
            {t('analytics.caseTypes')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-3 sm:space-y-4">
          <Card style={{ borderColor: '#ff4538', borderWidth: '1px', borderStyle: 'solid' }}>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">{t('analytics.casesByStatus')}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {t('analytics.casesByStatusDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 sm:h-64 flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">{t('analytics.noDataAvailable')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-3 sm:space-y-4">
          <Card style={{ borderColor: '#ff4538', borderWidth: '1px', borderStyle: 'solid' }}>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">
                {t('analytics.monthlyTrendsTitle')}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {t('analytics.monthlyTrendsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {monthlyTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 sm:h-64 flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">{t('analytics.noDataAvailable')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="space-y-3 sm:space-y-4">
          <Card style={{ borderColor: '#ff4538', borderWidth: '1px', borderStyle: 'solid' }}>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">
                {t('analytics.caseTypesDistribution')}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {t('analytics.caseTypesDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {serviceTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={serviceTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry: any) =>
                        `${entry.name}: ${((entry.percent || 0) * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {serviceTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 sm:h-64 flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">{t('analytics.noDataAvailable')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function AnalyticsViewSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-5 w-64 mt-2" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-20" />
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
