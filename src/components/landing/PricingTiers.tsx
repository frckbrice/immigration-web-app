'use client';

import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface PricingTierProps {
  name: string;
  tagline: string;
  features: string[];
  price: number;
  tier: 'basic' | 'standard' | 'premium';
  highlight?: boolean;
}

function PricingTier({ name, tagline, features, price, tier, highlight }: PricingTierProps) {
  const { t } = useTranslation();
  return (
    <Card
      className={`relative overflow-hidden border-2 transition-all duration-200 hover:shadow-lg bg-card dark:bg-[#1a3d4d] ${
        highlight
          ? 'shadow-lg scale-105 border-primary dark:border-[#ff4538]'
          : 'border-border dark:hover:border-[#ff4538]/50'
      }`}
    >
      {highlight && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-primary dark:bg-[#ff4538]" />
      )}
      <CardHeader>
        <CardTitle className="text-xl md:text-2xl mb-2 font-bold text-foreground/90">
          {name}
        </CardTitle>
        <CardDescription className="text-sm md:text-base leading-[1.6] font-normal text-foreground/70">
          {tagline}
        </CardDescription>
        <div className="mt-4">
          <span className="text-4xl font-bold text-foreground/90">${price.toLocaleString()}</span>
          <span className="text-sm ml-2 text-foreground/60">
            <span suppressHydrationWarning>{t('landing.pricing.oneTime') || 'one-time'}</span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary dark:text-[#ff4538]" />
              <span className="text-sm text-foreground/70">{feature}</span>
            </li>
          ))}
        </ul>
        <Button
          className={`w-full mt-6 ${
            highlight
              ? 'text-primary-foreground bg-primary hover:bg-primary/90 dark:bg-[#361d22] dark:text-white dark:border-[#ff4538] dark:hover:bg-[#4a252c] dark:border'
              : 'text-primary border-primary hover:bg-primary/10 dark:text-[#ff4538] dark:border-[#ff4538] dark:hover:bg-[#ff4538]/10'
          }`}
          variant={highlight ? 'default' : 'outline'}
          asChild
        >
          <Link href={`/checkout?tier=${tier}`}>
            <span suppressHydrationWarning>{t('landing.pricing.getStarted') || 'Get Started'}</span>
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function PricingTiers() {
  const { t } = useTranslation();

  const tiers = [
    {
      name: t('landing.pricing.basic.name') || 'Basic',
      tagline: t('landing.pricing.basic.tagline') || 'Essential immigration support',
      price: 500,
      tier: 'basic' as const,
      features: [
        t('landing.pricing.basic.feature1') || 'Document review & guidance',
        t('landing.pricing.basic.feature2') || 'Application form assistance',
        t('landing.pricing.basic.feature3') || 'Email support',
      ],
    },
    {
      name: t('landing.pricing.standard.name') || 'Standard',
      tagline: t('landing.pricing.standard.tagline') || 'Most popular choice',
      price: 1500,
      tier: 'standard' as const,
      features: [
        t('landing.pricing.standard.feature1') || 'Full application support',
        t('landing.pricing.standard.feature2') || 'Priority processing',
        t('landing.pricing.standard.feature3') || '24/7 phone & email support',
        t('landing.pricing.standard.feature4') || 'Case tracking dashboard',
      ],
      highlight: true,
    },
    {
      name: t('landing.pricing.premium.name') || 'Premium',
      tagline: t('landing.pricing.premium.tagline') || 'Complete immigration solution',
      price: 2000,
      tier: 'premium' as const,
      features: [
        t('landing.pricing.premium.feature1') || 'Dedicated immigration consultant',
        t('landing.pricing.premium.feature2') || 'Express processing',
        t('landing.pricing.premium.feature3') || 'Video consultations',
        t('landing.pricing.premium.feature4') || 'Priority support & updates',
      ],
    },
  ];

  return (
    <section className="relative py-8 md:py-12 lg:py-16 bg-background dark:bg-[#14303d]">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight mb-4 text-foreground/90">
            <span suppressHydrationWarning>
              {t('landing.pricing.title') || 'Fast, faster, and fastest'}
            </span>
          </h2>
          <p className="text-base md:text-lg max-w-3xl mx-auto leading-[1.7] font-normal text-foreground/70">
            <span suppressHydrationWarning>
              {t('landing.pricing.subtitle') ||
                'A portfolio of subscriptions for you to choose from to tailor fit your real time needs.'}
            </span>
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {tiers.map((tier, index) => (
            <PricingTier key={index} {...tier} />
          ))}
        </div>
        <div className="text-center mt-12">
          <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            <span suppressHydrationWarning>
              {t('landing.pricing.footer') || 'All plans include free consultation'}
            </span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-4 opacity-60">
            <div className="text-sm font-semibold text-foreground/80">
              {t('landing.pricing.partner1') || 'Student Visas'}
            </div>
            <div className="text-sm font-semibold text-foreground/80">
              {t('landing.pricing.partner2') || 'Work Permits'}
            </div>
            <div className="text-sm font-semibold text-foreground/80">
              {t('landing.pricing.partner3') || 'Family Sponsorship'}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
