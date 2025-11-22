'use client';

import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function GetStarted() {
  const { t } = useTranslation();

  return (
    <section className="relative py-8 md:py-12 lg:py-16" style={{ backgroundColor: '#091a24' }}>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-5 md:space-y-6">
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight"
            style={{ color: '#ffffff' }}
          >
            <span suppressHydrationWarning>{t('landing.getStarted.title') || 'Get started'}</span>
          </h2>
          <p
            className="text-base md:text-lg leading-[1.7] font-normal"
            style={{ color: 'rgba(255, 255, 255, 0.75)' }}
          >
            <span suppressHydrationWarning>
              {t('landing.getStarted.subtitle') ||
                'Meet with an expert immigration consultant and start your journey today.'}
            </span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              size="lg"
              className="text-lg px-12 h-14 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              style={{
                backgroundColor: '#351d22',
                borderColor: '#ff4538',
                borderWidth: '1px',
                borderStyle: 'solid',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#4a2830';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#351d22';
              }}
              asChild
            >
              <Link href="/register">
                <span suppressHydrationWarning>{t('landing.getStarted.cta') || 'Try Now'}</span>
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-12 h-14 transition-all duration-200"
              style={{
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: 'rgba(255, 255, 255, 0.8)',
                backgroundColor: 'transparent',
                borderWidth: '1px',
                borderStyle: 'solid',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              }}
              asChild
            >
              <Link href="/contact">
                <span suppressHydrationWarning>
                  {t('landing.getStarted.talk') || 'Talk to sales'}
                </span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
