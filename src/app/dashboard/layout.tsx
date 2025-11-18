'use client';

import { ReactNode, useEffect, useMemo, memo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/features/auth/store';
import Link from 'next/link';
import Image from 'next/image';
import { useLogout } from '@/features/auth/api/useAuth';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import {
  LogOut,
  Loader2,
  Menu,
  User,
  Settings as SettingsIcon,
  ChevronDown,
  LayoutDashboard,
  Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  getNavigationForRole,
  roleDisplayNames,
  roleBadgeColors,
  UserRole,
} from '@/lib/utils/role-permissions';
import { useRealtimeNotifications } from '@/features/notifications/hooks/useRealtimeNotifications';
import { useUnreadReceivedEmails } from '@/features/messages/hooks/useUnreadReceivedEmails';
import { apiClient } from '@/lib/utils/axios';
import { logger } from '@/lib/utils/logger';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const logoutMutation = useLogout();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Get role-based navigation items (must be called before any early returns)
  const allNavItems = useMemo(() => {
    if (!user?.role) return [];
    return getNavigationForRole(user.role as UserRole);
  }, [user?.role]);

  useEffect(() => {
    // Only redirect if auth check is complete (not loading) and user is not authenticated
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Real-time notifications
  useRealtimeNotifications();

  // Get unread received emails count for badge (agents/admins only)
  const { data: unreadReceivedEmailsCount } = useUnreadReceivedEmails();

  // Check payment status for CLIENT users
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      logger.info('[DashboardLayout] Checking payment status', {
        userId: user.id,
        role: user.role,
        pathname,
      });

      // AGENT and ADMIN bypass payment requirement
      if (user.role === 'AGENT' || user.role === 'ADMIN') {
        logger.info('[DashboardLayout] User bypasses payment check (AGENT/ADMIN)', {
          userId: user.id,
          role: user.role,
        });
        return;
      }

      // Prevent redirect loops - don't check if already on checkout page or success page
      if (pathname === '/checkout' || pathname.startsWith('/checkout/')) {
        logger.info('[DashboardLayout] Skipping payment check - already on checkout page', {
          userId: user.id,
          pathname,
        });
        return;
      }

      // Check payment status for CLIENT users
      const checkPaymentStatus = async () => {
        try {
          logger.info('[DashboardLayout] Calling payment status API', {
            userId: user.id,
            role: user.role,
          });

          const response = await apiClient.get('/api/payments/status');

          logger.info('[DashboardLayout] Payment status API response received', {
            userId: user.id,
            success: response.data.success,
            hasData: !!response.data.data,
            responseData: response.data.data,
          });

          if (response.data.success && response.data.data) {
            const paymentData = response.data.data;
            const hasPaid = paymentData.hasPaid === true;
            const bypassed = paymentData.bypassed === true;

            logger.info('[DashboardLayout] Payment status check result', {
              userId: user.id,
              role: user.role,
              hasPaid: paymentData.hasPaid,
              hasPaidBoolean: hasPaid,
              bypassed: paymentData.bypassed,
              bypassedBoolean: bypassed,
              willRedirect: !hasPaid && !bypassed,
            });

            // Only redirect if user hasn't paid and isn't bypassed
            if (!hasPaid && !bypassed) {
              if (pathname !== '/checkout' && !pathname.startsWith('/checkout/')) {
                logger.info('[DashboardLayout] Redirecting to checkout - payment required', {
                  userId: user.id,
                  hasPaid: paymentData.hasPaid,
                  bypassed: paymentData.bypassed,
                });
                router.push('/checkout');
              }
            } else {
              logger.info('[DashboardLayout] Payment verified - allowing access', {
                userId: user.id,
                hasPaid: paymentData.hasPaid,
                bypassed: paymentData.bypassed,
              });
            }
          } else {
            logger.warn('[DashboardLayout] Payment status API returned invalid response', {
              userId: user.id,
              success: response.data.success,
              hasData: !!response.data.data,
            });
          }
        } catch (error) {
          logger.error('[DashboardLayout] Failed to check payment status', error, {
            userId: user.id,
            role: user.role,
          });
          // On error, redirect to checkout to be safe
          if (pathname !== '/checkout' && !pathname.startsWith('/checkout/')) {
            router.push('/checkout');
          }
        }
      };

      // Check payment status after a short delay
      const delayTimer = setTimeout(() => {
        checkPaymentStatus();
      }, 1000);

      return () => clearTimeout(delayTimer);
    }
  }, [isLoading, isAuthenticated, user, router, pathname]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#091a24' }}
      >
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto" style={{ color: '#ff4538' }} />
          <p className="mt-4 text-white/70" suppressHydrationWarning>
            {t('common.loading')}
          </p>
        </div>
      </div>
    );
  }

  // Show loading state while redirecting to login
  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#091a24' }}
      >
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto" style={{ color: '#ff4538' }} />
          <p className="mt-4 text-white/70" suppressHydrationWarning>
            {t('dashboard.redirectingToLogin')}
          </p>
        </div>
      </div>
    );
  }

  const getInitials = () => {
    if (!user) return '??';
    return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const getRoleBadgeColor = (role?: string) => {
    if (!role) return '';
    return roleBadgeColors[role as UserRole] || '';
  };

  const getRoleDisplayName = (role?: string) => {
    if (!role) return 'Unknown';
    return roleDisplayNames[role as UserRole] || role;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#091a24' }}>
      {/* Top Navigation */}
      <header
        className="sticky top-0 z-50 w-full border-b backdrop-blur supports-[backdrop-filter]:bg-opacity-60"
        style={{ backgroundColor: '#091a24', borderColor: '#ff4538' }}
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo Section */}
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Button */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden text-white hover:bg-white/10"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-64"
                  style={{ backgroundColor: '#091a24', borderColor: 'rgba(255, 69, 56, 0.1)' }}
                >
                  <SheetHeader>
                    <SheetTitle className="text-left text-white">
                      {t('dashboard.navigation')}
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="mt-6 space-y-2">
                    {allNavItems.map((item) => {
                      const badgeCount =
                        item.href === '/dashboard/messages' && unreadReceivedEmailsCount
                          ? unreadReceivedEmailsCount
                          : undefined;

                      // Check if current path matches or starts with item href (for nested routes)
                      const isActive =
                        pathname === item.href ||
                        (pathname.startsWith(item.href + '/') && item.href !== '/dashboard');

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            'flex items-center justify-between space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                            isActive
                              ? 'text-white'
                              : 'text-white/70 hover:bg-white/10 hover:text-white'
                          )}
                          style={
                            isActive
                              ? {
                                  backgroundColor: '#ff4538',
                                }
                              : undefined
                          }
                        >
                          <div className="flex items-center space-x-3">
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </div>
                          {badgeCount && badgeCount > 0 && (
                            <Badge
                              variant="secondary"
                              className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs"
                            >
                              {badgeCount}
                            </Badge>
                          )}
                        </Link>
                      );
                    })}
                  </nav>
                  <Separator
                    className="my-4"
                    style={{ backgroundColor: 'rgba(255, 69, 56, 0.1)' }}
                  />
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 px-4 text-white">
                      <LanguageSwitcher />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <Link
                href="/dashboard"
                className="flex items-center space-x-2 sm:space-x-3 cursor-pointer"
              >
                <div className="relative flex items-center justify-center w-12 h-12 sm:w-12 sm:h-12 rounded-lg bg-transparent dark:bg-white/10 dark:backdrop-blur-sm dark:border dark:border-white/20 p-1.5 flex-shrink-0">
                  <Image
                    src="/images/app-logo.png"
                    alt="Patrick Travel Service"
                    width={48}
                    height={48}
                    className="object-contain w-full h-full"
                    priority
                  />
                </div>
                <span
                  className="font-bold text-sm sm:text-lg leading-tight"
                  style={{ color: '#ff4538' }}
                >
                  Patrick Travel Service
                </span>
              </Link>
            </div>

            {/* Right Section - Language & User Info */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Language Switcher - Visible on all screen sizes */}
              <div className="flex items-center text-white">
                <LanguageSwitcher variant="light" />
              </div>

              <Separator orientation="vertical" className="h-6 hidden sm:block" />

              {/* User Profile Dropdown - Shows profile picture with initials fallback */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-auto p-1">
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={user?.profilePicture || undefined}
                        alt={`${user?.firstName} ${user?.lastName}`}
                      />
                      <AvatarFallback
                        className="text-sm font-medium text-white"
                        style={{
                          backgroundColor: '#091a24',
                          borderColor: '#ff4538',
                          borderWidth: '1px',
                          borderStyle: 'solid',
                        }}
                      >
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                      <Badge className={cn('w-fit mt-1', getRoleBadgeColor(user?.role))}>
                        {getRoleDisplayName(user?.role)}
                      </Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/" className="flex items-center">
                      <Home className="mr-2 h-4 w-4" />
                      <span>{t('dashboard.goBackToSite')}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/profile" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      <span>{t('profile.title')}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings" className="flex items-center">
                      <SettingsIcon className="mr-2 h-4 w-4" />
                      <span>{t('settings.title')}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                    className="text-red-600 focus:text-red-600"
                  >
                    {logoutMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span>{t('auth.loggingOut')}</span>
                      </>
                    ) : (
                      <>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>{t('auth.logout')}</span>
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className="w-64 border-r min-h-[calc(100vh-4rem)] hidden md:block"
          style={{ backgroundColor: '#091a24', borderColor: '#ff4538' }}
        >
          <div className="w-full max-w-7xl mx-auto">
            <nav className="p-4 space-y-2">
              {/* Role-Based Navigation */}
              {allNavItems.map((item) => {
                // Add badge for Messages link with unread received emails count
                const badgeCount =
                  item.href === '/dashboard/messages' && unreadReceivedEmailsCount
                    ? unreadReceivedEmailsCount
                    : undefined;

                // Check if current path matches or starts with item href (for nested routes)
                const isActive =
                  pathname === item.href ||
                  (pathname.startsWith(item.href + '/') && item.href !== '/dashboard');

                return (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    isActive={isActive}
                    badge={badgeCount}
                  >
                    {item.title}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main
          className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden"
          style={{ backgroundColor: '#0a1f2e' }}
        >
          <div className="mx-auto max-w-7xl w-full text-white">{children}</div>
        </main>
      </div>
    </div>
  );
}

// PERFORMANCE: Memoize NavLink to prevent unnecessary re-renders
const NavLink = memo(function NavLink({
  href,
  icon: Icon,
  isActive,
  badge,
  children,
}: {
  href: string;
  icon: any;
  isActive?: boolean;
  badge?: number;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center justify-between space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
        isActive ? 'text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
      )}
      style={
        isActive
          ? {
              backgroundColor: '#ff4538',
            }
          : undefined
      }
    >
      <div className="flex items-center space-x-3">
        <Icon className="h-4 w-4" />
        <span>{children}</span>
      </div>
      {badge && badge > 0 && (
        <Badge
          variant="secondary"
          className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {badge}
        </Badge>
      )}
    </Link>
  );
});
