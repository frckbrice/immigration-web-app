'use client';

import { useTranslation } from 'react-i18next';
import { Hero } from '@/components/landing/Hero';
import { FeatureSections } from '@/components/landing/FeatureSections';
import { TrustLogos } from '@/components/landing/TrustLogos';
import { FeatureGrid } from '@/components/landing/FeatureGrid';
import { PricingTiers } from '@/components/landing/PricingTiers';
import { GetStarted } from '@/components/landing/GetStarted';
import { FAQSection } from '@/features/faq/components';

export function LandingView() {
  const { t } = useTranslation();

  return (
    <>
      <Hero />
      <FeatureSections />
      <TrustLogos />
      <FeatureGrid />
      <PricingTiers />
      {/* FAQ Section - Managed from Admin Dashboard */}
      <FAQSection limit={8} />
      <GetStarted />
    </>
  );
}
