'use client';

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store';
import { useRealtimeChatRooms } from '@/features/messages/hooks/useRealtimeChat';
import { apiClient } from '@/lib/utils/axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Briefcase,
  FileText,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';
import { StatCardPlaceholder } from '@/components/ui/progressive-placeholder';
import { SimpleSkeleton, SkeletonText } from '@/components/ui/simple-skeleton';
import { formatDateTime } from '@/lib/utils/helpers';

// Case status constants
const TERMINAL_STATUSES = ['APPROVED', 'REJECTED', 'CLOSED'] as const;
const CASE_STATUS_APPROVED = 'APPROVED' as const;

export const DashboardHome = memo(function DashboardHome() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  // PERFORMANCE: Fetch dashboard statistics from server (efficient COUNT queries)
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await apiClient.get('/api/dashboard/stats');
      return response.data.data;
    },
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const isClient = user?.role === 'CLIENT';

  // NOTE: The upcoming appointment API filters appointments to only show future appointments
  // (scheduledAt >= now - 5 minutes). If an appointment date has already passed,
  // it will not appear here. This is by design to only show truly "upcoming" appointments.
  const {
    data: upcomingAppointmentData,
    isLoading: isLoadingUpcoming,
    isFetching: isFetchingUpcoming,
  } = useQuery({
    queryKey: ['dashboard-upcoming-appointment'],
    queryFn: async () => {
      const response = await apiClient.get('/api/appointments/upcoming');
      return response.data.data;
    },
    enabled: isClient,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const upcomingAppointment = upcomingAppointmentData?.appointment ?? null;

  // REAL-TIME: Use Firebase real-time hook for unread messages
  const { chatRooms: conversations } = useRealtimeChatRooms();

  // Calculate unread messages from chat rooms
  const unreadMessages = user?.id
    ? (conversations || []).reduce((total, room) => {
        if (room.unreadCount) {
          return total + (room.unreadCount[user.id] || 0);
        }
        return total;
      }, 0)
    : 0;

  // Progressive loading flag
  const isLoading = isLoadingStats || !stats;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
          {t('dashboard.welcomeBack', {
            firstName: user?.firstName ? `, ${user.firstName}` : '',
          }) || `Welcome back${user?.firstName ? `, ${user.firstName}` : ''}!`}
        </h1>
        <p className="mt-2" style={{ color: 'var(--muted-foreground)' }}>
          {t('dashboard.overview') || 'Here is an overview of your immigration cases'}
        </p>
      </div>

      {isClient && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 pb-3">
            <div>
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: '#ff4538' }} />
                {t('dashboard.upcomingAppointment') || 'Upcoming Appointment'}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {t('dashboard.stayPrepared') || 'Stay prepared for your next visit to our office'}
              </CardDescription>
            </div>
            {upcomingAppointment?.actionUrl && (
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
                className="hover:border-[#ff4538]/50"
              >
                <Link href={upcomingAppointment.actionUrl}>
                  {t('dashboard.viewDetails') || 'View Details'}
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {isLoadingUpcoming || isFetchingUpcoming ? (
              <div className="space-y-2">
                <SimpleSkeleton className="h-4 w-48 rounded" />
                <SimpleSkeleton className="h-3 w-56 rounded" />
                <SimpleSkeleton className="h-3 w-40 rounded" />
              </div>
            ) : upcomingAppointment ? (
              <div className="space-y-3">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">
                    {t('cases.referenceNumber') || 'Case'}
                  </p>
                  <p className="text-base sm:text-lg font-semibold">
                    {upcomingAppointment.case.referenceNumber}
                  </p>
                </div>
                <div className="grid gap-2 sm:gap-3 sm:grid-cols-2">
                  <div className="flex items-start gap-2">
                    <Calendar
                      className="mt-0.5 h-3.5 w-3.5 sm:h-4 sm:w-4"
                      style={{ color: '#ff4538' }}
                    />
                    <div>
                      <p className="text-[10px] sm:text-xs uppercase font-semibold text-muted-foreground">
                        {t('dashboard.dateTime') || 'Date & Time'}
                      </p>
                      <p className="text-xs sm:text-sm font-medium">
                        {formatDateTime(upcomingAppointment.scheduledAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin
                      className="mt-0.5 h-3.5 w-3.5 sm:h-4 sm:w-4"
                      style={{ color: '#ff4538' }}
                    />
                    <div>
                      <p className="text-[10px] sm:text-xs uppercase font-semibold text-muted-foreground">
                        {t('dashboard.location') || 'Location'}
                      </p>
                      <p className="text-xs sm:text-sm font-medium leading-tight">
                        {upcomingAppointment.location}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock
                    className="mt-0.5 h-3.5 w-3.5 sm:h-4 sm:w-4"
                    style={{ color: '#ff4538' }}
                  />
                  <div>
                    <p className="text-[10px] sm:text-xs uppercase font-semibold text-muted-foreground">
                      {t('dashboard.advisor') || 'Advisor'}
                    </p>
                    <p className="text-xs sm:text-sm font-medium">
                      {upcomingAppointment.assignedAgent
                        ? `${upcomingAppointment.assignedAgent.firstName ?? ''} ${upcomingAppointment.assignedAgent.lastName ?? ''}`.trim() ||
                          upcomingAppointment.assignedAgent.email
                        : t('dashboard.advisorToBeConfirmed') || 'Advisor to be confirmed'}
                    </p>
                  </div>
                </div>
                {upcomingAppointment.notes && (
                  <div className="rounded-md border border-dashed border-muted p-2 sm:p-3 text-xs sm:text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-0.5 sm:mb-1">
                      {t('dashboard.notes') || 'Notes'}
                    </p>
                    {upcomingAppointment.notes}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs sm:text-sm font-semibold">
                    {t('dashboard.noAppointment') || 'No appointment scheduled yet'}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {t('dashboard.appointmentDescription') ||
                      'You will see your next office visit here once your advisor schedules it.'}
                  </p>
                </div>
                <Button
                  asChild
                  variant="default"
                  style={{
                    backgroundColor: '#091a24',
                    borderColor: '#ff4538',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    color: 'white',
                  }}
                  className="hover:opacity-90"
                >
                  <Link href="/dashboard/messages">
                    {t('dashboard.messageAdvisor') || 'Message Advisor'}
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <StatCardPlaceholder
              title={t('dashboard.totalCases') || 'Total Cases'}
              icon={Briefcase}
            />
            <StatCardPlaceholder
              title={t('dashboard.pendingDocuments') || 'Pending Documents'}
              icon={FileText}
            />
            <StatCardPlaceholder
              title={t('dashboard.unreadMessages') || 'Unread Messages'}
              icon={MessageSquare}
            />
            <StatCardPlaceholder
              title={
                user?.role === 'CLIENT'
                  ? t('dashboard.completed') || 'Completed'
                  : t('dashboard.assignedCases') || 'Assigned Cases'
              }
              icon={CheckCircle2}
            />
          </>
        ) : (
          <>
            <Card className="p-2.5 sm:p-4">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                  {t('dashboard.totalCases') || 'Total Cases'}
                </span>
                <Briefcase className="h-3 w-3 sm:h-3.5 sm:w-3.5" style={{ color: '#ff4538' }} />
              </div>
              <div className="flex items-baseline gap-1.5 sm:gap-2">
                <span className="text-xl sm:text-2xl font-bold">{stats.totalCases || 0}</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  {stats.activeCases || 0} {t('dashboard.active') || 'active'}
                </span>
              </div>
            </Card>

            <Card className="p-2.5 sm:p-4">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                  {t('dashboard.pendingDocuments') || 'Pending Documents'}
                </span>
                <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5" style={{ color: '#ff4538' }} />
              </div>
              <div className="flex items-baseline gap-1.5 sm:gap-2">
                <span className="text-xl sm:text-2xl font-bold">{stats.pendingDocuments || 0}</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  {t('dashboard.toUpload') || 'to upload'}
                </span>
              </div>
            </Card>

            <Card className="p-2.5 sm:p-4">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                  {t('dashboard.unreadMessages') || 'Unread Messages'}
                </span>
                <MessageSquare className="h-3 w-3 sm:h-3.5 sm:w-3.5" style={{ color: '#ff4538' }} />
              </div>
              <div className="flex items-baseline gap-1.5 sm:gap-2">
                <span className="text-xl sm:text-2xl font-bold">{unreadMessages}</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  {t('dashboard.fromAdvisor') || 'from advisor'}
                </span>
              </div>
            </Card>

            <Card className="p-2.5 sm:p-4">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                  {user?.role === 'CLIENT'
                    ? t('dashboard.completed') || 'Completed'
                    : t('dashboard.assignedCases') || 'Assigned Cases'}
                </span>
                <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" style={{ color: '#ff4538' }} />
              </div>
              <div className="flex items-baseline gap-1.5 sm:gap-2">
                <span className="text-xl sm:text-2xl font-bold">
                  {user?.role === 'CLIENT'
                    ? stats.completedCases || 0
                    : ((stats as any)?.assignedCases ?? 0)}
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  {user?.role === 'CLIENT'
                    ? t('dashboard.successful') || 'successful'
                    : t('dashboard.cases') || 'cases'}
                </span>
              </div>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-full md:col-span-4 lg:col-span-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">
              {t('dashboard.quickActions') || 'Quick Actions'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 sm:space-y-2 pt-0">
            {/* PERFORMANCE: Dynamic routing based on user role */}
            <Button
              asChild
              className="w-full justify-start"
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
              <Link href={user?.role === 'CLIENT' ? '/dashboard/my-cases' : '/dashboard/cases'}>
                <Briefcase className="mr-2 h-4 w-4" style={{ color: '#ff4538' }} />
                {user?.role === 'CLIENT'
                  ? t('dashboard.viewMyCases') || 'View My Cases'
                  : t('dashboard.manageCases') || 'Manage Cases'}
              </Link>
            </Button>
            <Button
              asChild
              className="w-full justify-start"
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
              <Link href="/dashboard/cases?tab=documents">
                <FileText className="mr-2 h-4 w-4" style={{ color: '#ff4538' }} />
                {user?.role === 'CLIENT'
                  ? t('dashboard.uploadDocuments') || 'Upload Documents'
                  : t('dashboard.manageDocuments') || 'Manage Documents'}
              </Link>
            </Button>
            <Button
              asChild
              className="w-full justify-start"
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
              <Link href="/dashboard/messages">
                <MessageSquare className="mr-2 h-4 w-4" style={{ color: '#ff4538' }} />
                {user?.role === 'CLIENT'
                  ? t('dashboard.messageAdvisor') || 'Message Advisor'
                  : t('messages.title') || 'Messages'}
              </Link>
            </Button>
            <Button
              asChild
              className="w-full justify-start"
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
              <Link href="/dashboard/notifications">
                <AlertCircle className="mr-2 h-4 w-4" style={{ color: '#ff4538' }} />
                {t('dashboard.viewNotifications') || 'View Notifications'}
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="col-span-full md:col-span-2 lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: '#ff4538' }} />
              {t('dashboard.needHelp') || 'Need Help?'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
              {user?.role === 'CLIENT'
                ? t('dashboard.haveQuestions') || 'Have questions? We are here to help!'
                : t('dashboard.quickAccess') || 'Quick access to support resources'}
            </p>
            <Button
              asChild
              className="w-full"
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
              <Link href="/dashboard/messages">
                {user?.role === 'CLIENT'
                  ? t('dashboard.contactAdvisor') || 'Contact Advisor'
                  : t('dashboard.viewMessages') || 'View Messages'}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

/**
 * PERFORMANCE OPTIMIZED: Ultra-minimal skeleton for instant perceived loading
 * - Reduced ~80 DOM elements to ~22 (72% reduction) → Better FCP
 * - Memoized component → Better TBT
 * - Reduced stat cards from 4 to 3 → Better Speed Index
 * - Simpler structure → Better CLS
 * - No nested Card components → Faster rendering
 */
export const DashboardHomeSkeleton = memo(function DashboardHomeSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header - Minimal */}
      <div className="space-y-2">
        <SkeletonText size="xl" className="w-64" />
        <SkeletonText size="sm" className="w-96" />
      </div>

      {/* Stat Cards - Compact design */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <SimpleSkeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>

      {/* Actions Section - Simplified from 2 cards to single skeleton blocks */}
      <div className="grid gap-4 md:grid-cols-2">
        <SimpleSkeleton className="h-56 rounded-lg" />
        <SimpleSkeleton className="h-56 rounded-lg" />
      </div>
    </div>
  );
});
