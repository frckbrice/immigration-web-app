'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, X, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import { useAuthStore } from '@/features/auth/store';

// PERFORMANCE: Memoized Navbar component
export const Navbar = memo(function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();

  // PERFORMANCE: Direct access to avoid memoization dependency issues
  const navigation = [
    { nameKey: 'landing.footer.services', href: '/services' },
    { nameKey: 'landing.testimonials.title', href: '/#testimonials' },
    { nameKey: 'landing.contact.title', href: '/contact' },
    { nameKey: 'landing.footer.about', href: '/about' },
  ];

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 w-full border-b bg-background border-border backdrop-blur-sm bg-background/95"
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          {/* Logo - Reduced on mobile to make room for theme switcher */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            {/* PERFORMANCE: Priority loading for logo (above the fold) */}
            <div className="relative w-8 h-8 sm:w-12 sm:h-12 shrink-0 rounded-lg bg-white/40 p-1 sm:p-1.5 flex items-center justify-center overflow-hidden">
              <Image
                src="/images/app-logo.png"
                alt="Patrick Travel Service"
                width={40}
                height={40}
                className="object-cover w-full h-full"
                priority
              />
            </div>
            <span className="font-bold text-lg sm:text-xl hidden md:inline-block text-primary">
              Patrick Travel Service
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navigation.map((item) => (
              <Link
                key={item.nameKey}
                href={item.href}
                className="text-md font-medium transition-colors text-foreground/80 hover:text-primary"
              >
                <span suppressHydrationWarning>{t(item.nameKey)}</span>
              </Link>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <div className="flex-shrink-0">
                <ThemeSwitcher />
              </div>
              <div className="hidden md:flex">
                <LanguageSwitcher />
              </div>
            </div>

            {/* SESSION AWARE: Show different buttons based on auth status */}
            <div className="hidden md:flex items-center space-x-2">
              {isAuthenticated ? (
                <Button
                  className="text-primary-foreground bg-primary hover:bg-primary/90"
                  asChild
                >
                  <Link href="/dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span suppressHydrationWarning>{t('common.dashboard') || 'Dashboard'}</span>
                  </Link>
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="transition-colors text-foreground/80 border-border hover:text-primary hover:border-primary hover:bg-primary/10"
                    asChild
                  >
                    <Link href="/login">
                      <span suppressHydrationWarning>{t('auth.login')}</span>
                    </Link>
                  </Button>
                  <Button
                    className="text-primary-foreground bg-primary hover:bg-primary/90"
                    asChild
                  >
                    <Link href="/register">
                      <span suppressHydrationWarning>{t('auth.signUp')}</span>
                    </Link>
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-foreground hover:text-primary hover:bg-primary/10"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t bg-background border-border">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-3">
              {navigation.map((item) => (
                <Link
                  key={item.nameKey}
                  href={item.href}
                  className="block py-2 text-md font-medium transition-colors text-foreground/80 hover:text-primary"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span suppressHydrationWarning>{t(item.nameKey)}</span>
                </Link>
              ))}
              <div className="flex items-center space-x-2 pt-2">
                <ThemeSwitcher />
                <LanguageSwitcher />
              </div>
              {/* SESSION AWARE: Show different buttons for mobile */}
              <div className="flex flex-col space-y-2 pt-2">
                {isAuthenticated ? (
                  <Button
                    className="w-full text-primary-foreground bg-primary hover:bg-primary/90"
                    asChild
                  >
                    <Link href="/dashboard">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span suppressHydrationWarning>{t('common.dashboard') || 'Dashboard'}</span>
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="w-full transition-colors text-primary border-primary hover:bg-primary/10"
                      asChild
                    >
                      <Link href="/login">
                        <span suppressHydrationWarning>{t('auth.login')}</span>
                      </Link>
                    </Button>
                    <Button
                      className="w-full text-primary-foreground bg-primary hover:bg-primary/90"
                      asChild
                    >
                      <Link href="/register">
                        <span suppressHydrationWarning>{t('auth.signUp')}</span>
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
      <div className="h-16 md:h-20" aria-hidden />
    </>
  );
});
