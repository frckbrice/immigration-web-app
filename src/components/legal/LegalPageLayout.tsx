'use client';

import { useTranslation } from 'react-i18next';
import { Calendar, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

interface LegalPageLayoutProps {
  titleKey: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalPageLayout({ titleKey, lastUpdated, children }: LegalPageLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen relative overflow-hidden bg-background dark:bg-[#091a24]">
      {/* Theme-aware Background - Redis style for dark mode */}
      <div className="fixed inset-0 -z-10">
        {/* Base background */}
        <div className="absolute inset-0 bg-background dark:bg-[#091a24]"></div>

        {/* Subtle animated gradient orbs - Theme-aware */}
        <div
          className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full blur-3xl opacity-20 dark:opacity-20"
          style={{
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--primary) 20%, transparent) 0%, transparent 70%)',
            animation: 'pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        ></div>

        <div
          className="absolute top-1/3 left-0 w-[600px] h-[600px] rounded-full blur-3xl opacity-15 dark:opacity-15"
          style={{
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--primary) 15%, transparent) 0%, transparent 70%)',
            animation: 'pulse 10s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            animationDelay: '2s',
          }}
        ></div>

        <div
          className="absolute bottom-0 right-1/4 w-[700px] h-[700px] rounded-full blur-3xl opacity-15 dark:opacity-15"
          style={{
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--primary) 15%, transparent) 0%, transparent 70%)',
            animation: 'pulse 12s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            animationDelay: '4s',
          }}
        ></div>
      </div>

      {/* Header Section */}
      <div className="border-b border-border bg-background dark:bg-[#091a24]">
        <div className="container max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            className="mb-6 transition-colors text-foreground/80 hover:text-primary hover:bg-primary/10"
            asChild
          >
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.goHome')}
            </Link>
          </Button>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 text-foreground/90">
            {t(titleKey)}
          </h1>

          <div className="flex items-center gap-2 text-sm text-foreground/70">
            <Calendar className="h-4 w-4" />
            <span>
              {t('legal.lastUpdated')}: {lastUpdated}
            </span>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <Card className="p-8 md:p-12 shadow-lg border-2 bg-card dark:bg-[rgba(255,255,255,0.03)] border-border">
          <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:scroll-mt-20 text-foreground/90 prose-headings:text-foreground/90 prose-p:text-foreground/70 prose-li:text-foreground/70 prose-strong:text-foreground/90 prose-a:text-primary hover:prose-a:text-primary/90">
            {children}
          </div>
        </Card>

        {/* Footer Note */}
        <Card className="mt-8 p-6 border-2 border-dashed bg-card dark:bg-[rgba(255,255,255,0.03)] border-border">
          <p className="text-sm text-foreground/70">
            <strong className="text-foreground/90">{t('legal.disclaimer')}:</strong>{' '}
            {t('legal.disclaimerText')}
          </p>
        </Card>

        {/* Quick Links */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Button
            variant="outline"
            className="transition-all duration-200 text-primary border-primary hover:bg-primary/10"
            asChild
          >
            <Link href="/privacy">{t('legal.privacy.title')}</Link>
          </Button>
          <Button
            variant="outline"
            className="transition-all duration-200 text-primary border-primary hover:bg-primary/10"
            asChild
          >
            <Link href="/terms">{t('legal.terms.title')}</Link>
          </Button>
          <Button
            variant="outline"
            className="transition-all duration-200 text-primary border-primary hover:bg-primary/10"
            asChild
          >
            <Link href="/cookies">{t('legal.cookies.title')}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
