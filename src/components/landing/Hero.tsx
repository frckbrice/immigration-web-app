'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Hero() {
  const { t } = useTranslation();

  return (
    <section className="relative w-full min-h-[90vh] flex items-center justify-center overflow-hidden pt-20 md:pt-24">
      {/* Background Gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0" style={{ backgroundColor: '#091a24' }} />
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(255, 69, 56, 0.2) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-3xl opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(255, 69, 56, 0.15) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24">
        <div className="max-w-5xl mx-auto text-center space-y-8 md:space-y-12">
          {/* Main Headline */}
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <h1
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.1]"
              style={{ color: '#ffffff' }}
            >
              <span suppressHydrationWarning>{t('landing.hero.title')}</span>
            </h1>
            <p
              className="text-xl md:text-2xl lg:text-3xl max-w-4xl mx-auto leading-relaxed font-light"
              style={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              <span suppressHydrationWarning>{t('landing.hero.subtitle')}</span>
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
            <Button
              size="lg"
              className="text-lg px-12 h-14 shadow-lg hover:shadow-xl transition-all duration-200 group text-white"
              style={{ backgroundColor: '#ff4538' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#ff5c50';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ff4538';
              }}
              asChild
            >
              <Link href="/register">
                <span suppressHydrationWarning>{t('landing.hero.cta')}</span>
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-12 h-14 border-2 transition-all duration-200"
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
              <Link href="/login">
                <span suppressHydrationWarning>{t('landing.hero.login')}</span>
              </Link>
            </Button>
          </div>

          {/* Trusted Partners - Immigration & Travel Companies */}
          <div className="pt-8 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
            <p className="text-sm mb-4" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              <span suppressHydrationWarning>
                {t('landing.hero.trustedPartners') || 'Trusted by leading immigration partners:'}
              </span>
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 opacity-60">
              <div className="text-lg font-semibold" style={{ color: '#ffffff' }}>
                {t('landing.hero.partner1') || 'IRCC'}
              </div>
              <div className="text-lg font-semibold" style={{ color: '#ffffff' }}>
                {t('landing.hero.partner2') || 'CIC'}
              </div>
              <div className="text-lg font-semibold" style={{ color: '#ffffff' }}>
                {t('landing.hero.partner3') || 'USCIS'}
              </div>
              <div className="text-lg font-semibold" style={{ color: '#ffffff' }}>
                {t('landing.hero.partner4') || 'Home Office UK'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
