'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Hero() {
  const { t } = useTranslation();

  return (
    <section className="relative w-full min-h-[60vh] md:min-h-[70vh] flex items-center justify-center overflow-hidden pt-4 md:pt-6">
      {/* Background Gradient - Redis style for dark mode */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-background dark:bg-[#091a24]" />
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl opacity-20 dark:opacity-20"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--primary) 20%, transparent) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-3xl opacity-15 dark:opacity-15"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--primary) 15%, transparent) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 lg:py-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Column: Text Content */}
          <div className="space-y-6 md:space-y-8 text-center lg:text-left animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Main Headline */}
            <div className="space-y-5 md:space-y-6">
              <h1 className="text-4xl sm:text-5xl md:text-[64px] font-bold tracking-tight leading-[1.1] text-foreground/90">
                <span suppressHydrationWarning>{t('landing.hero.title')}</span>
              </h1>
              <p className="text-base md:text-lg lg:text-xl leading-[1.6] font-normal text-foreground/70">
                <span suppressHydrationWarning>{t('landing.hero.subtitle')}</span>
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4 md:pt-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
              <Button
                size="lg"
                className="text-lg px-12 h-14 shadow-lg hover:shadow-xl transition-all duration-200 group text-primary-foreground bg-primary hover:bg-primary/90 border border-primary"
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
                className="text-lg px-12 h-14 transition-all duration-200 text-foreground/80 border-border hover:bg-accent hover:text-accent-foreground"
                asChild
              >
                <Link href="/login">
                  <span suppressHydrationWarning>{t('landing.hero.login')}</span>
                </Link>
              </Button>
            </div>

            {/* Trusted Partners - Immigration & Travel Companies */}
            <div className="pt-6 md:pt-8 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
              <p className="text-xs sm:text-sm mb-3 md:mb-4 text-foreground/60">
                <span suppressHydrationWarning>
                  {t('landing.hero.trustedPartners') || 'Trusted by leading immigration partners:'}
                </span>
              </p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 md:gap-6">
                <div className="text-sm md:text-lg font-semibold text-foreground/70">
                  {t('landing.hero.partner1') || 'IRCC'}
                </div>
                <div className="text-sm md:text-lg font-semibold text-foreground/70">
                  {t('landing.hero.partner2') || 'CIC'}
                </div>
                <div className="text-sm md:text-lg font-semibold text-foreground/70">
                  {t('landing.hero.partner3') || 'USCIS'}
                </div>
                <div className="text-sm md:text-lg font-semibold text-foreground/70">
                  {t('landing.hero.partner4') || 'Home Office UK'}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Dashboard Image */}
          <div className="relative w-full h-[300px] sm:h-[350px] md:h-[400px] lg:h-[450px] animate-in fade-in slide-in-from-right duration-700 delay-200">
            {/* Image Container with Modern Styling */}
            <div className="relative w-full h-full rounded-xl md:rounded-2xl overflow-hidden shadow-xl border border-border">
              {/* Modern Subtle Overlay - Top to bottom gradient - Theme-aware */}
              <div
                className="absolute inset-0 z-10 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(to bottom, color-mix(in srgb, var(--background) 10%, transparent) 0%, transparent 30%, transparent 70%, color-mix(in srgb, var(--background) 15%, transparent) 100%)',
                }}
              />

              {/* Subtle Accent Border - Theme-aware */}
              <div
                className="absolute inset-0 rounded-xl md:rounded-2xl z-20 pointer-events-none border border-primary/15"
                style={{
                  boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--foreground) 5%, transparent)',
                }}
              />

              {/* Dashboard Image */}
              <Image
                src="/images/pts_home_hero.png"
                alt="Immigration Services Dashboard"
                fill
                priority
                className="object-cover object-center"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                style={{
                  filter: 'brightness(0.98) contrast(1.02) saturate(1.05)',
                }}
              />

              {/* Modern Corner Glow Effect - Theme-aware */}
              <div
                className="absolute top-0 right-0 w-32 h-32 z-20 pointer-events-none opacity-40"
                style={{
                  background:
                    'radial-gradient(circle, color-mix(in srgb, var(--primary) 15%, transparent) 0%, transparent 70%)',
                  filter: 'blur(20px)',
                }}
              />
            </div>

            {/* Subtle Floating Shadow Effect - Theme-aware */}
            <div
              className="absolute -inset-2 md:-inset-3 rounded-xl md:rounded-2xl -z-10 blur-xl opacity-20"
              style={{
                background: 'radial-gradient(circle, color-mix(in srgb, var(--primary) 30%, transparent) 0%, transparent 70%)',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
