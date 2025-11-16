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
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#091a24' }}>
      {/* Background gradients */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0" style={{ backgroundColor: '#091a24' }} />
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(255, 69, 56, 0.2) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Header Section */}
      <div
        className="border-b"
        style={{ backgroundColor: '#091a24', borderColor: 'rgba(255, 255, 255, 0.1)' }}
      >
        <div className="container max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            className="mb-6 transition-colors"
            style={{ color: 'rgba(255, 255, 255, 0.8)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ff4538';
              e.currentTarget.style.backgroundColor = 'rgba(255, 69, 56, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            asChild
          >
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.goHome')}
            </Link>
          </Button>

          <h1
            className="text-4xl sm:text-5xl font-bold tracking-tight mb-4"
            style={{ color: '#ffffff' }}
          >
            {t(titleKey)}
          </h1>

          <div
            className="flex items-center gap-2 text-sm"
            style={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            <Calendar className="h-4 w-4" />
            <span>
              {t('legal.lastUpdated')}: {lastUpdated}
            </span>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <Card
          className="p-8 md:p-12 shadow-lg border-2"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <div
            className="prose prose-slate dark:prose-invert max-w-none prose-headings:scroll-mt-20"
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
            }}
          >
            <style
              dangerouslySetInnerHTML={{
                __html: `
              .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
                color: #ffffff !important;
              }
              .prose p, .prose li, .prose span {
                color: rgba(255, 255, 255, 0.8) !important;
              }
              .prose strong {
                color: #ffffff !important;
              }
              .prose a {
                color: #ff4538 !important;
              }
              .prose a:hover {
                color: #ff5c50 !important;
              }
            `,
              }}
            />
            {children}
          </div>
        </Card>

        {/* Footer Note */}
        <Card
          className="mt-8 p-6 border-2 border-dashed"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            <strong style={{ color: '#ffffff' }}>{t('legal.disclaimer')}:</strong>{' '}
            {t('legal.disclaimerText')}
          </p>
        </Card>

        {/* Quick Links */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Button
            variant="outline"
            className="transition-all duration-200"
            style={{
              borderColor: '#ff4538',
              color: '#ff4538',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 69, 56, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            asChild
          >
            <Link href="/privacy">{t('legal.privacy.title')}</Link>
          </Button>
          <Button
            variant="outline"
            className="transition-all duration-200"
            style={{
              borderColor: '#ff4538',
              color: '#ff4538',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 69, 56, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            asChild
          >
            <Link href="/terms">{t('legal.terms.title')}</Link>
          </Button>
          <Button
            variant="outline"
            className="transition-all duration-200"
            style={{
              borderColor: '#ff4538',
              color: '#ff4538',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 69, 56, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            asChild
          >
            <Link href="/cookies">{t('legal.cookies.title')}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
