'use client';

import { useTranslation } from 'react-i18next';
import { Zap, Rocket, Sparkles, Search, Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface FeatureSectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  ctaText?: string;
  ctaLink?: string;
  highlight?: string;
}

function FeatureSection({
  icon,
  title,
  description,
  ctaText,
  ctaLink,
  highlight,
}: FeatureSectionProps) {
  return (
    <section className="relative py-8 md:py-12 lg:py-16" style={{ backgroundColor: '#091a24' }}>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-5 md:space-y-6">
          <div className="flex justify-center mb-5">
            <div className="p-4 rounded-2xl" style={{ backgroundColor: 'rgba(255, 69, 56, 0.1)' }}>
              {icon}
            </div>
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight"
            style={{ color: '#ffffff' }}
          >
            {title}
          </h2>
          {highlight && (
            <p className="text-base md:text-lg font-semibold" style={{ color: '#ff4538' }}>
              {highlight}
            </p>
          )}
          <p
            className="text-base md:text-lg max-w-3xl mx-auto leading-[1.7] font-normal"
            style={{ color: 'rgba(255, 255, 255, 0.75)' }}
          >
            {description}
          </p>
          {ctaText && ctaLink && (
            <div className="pt-4">
              <Button
                variant="outline"
                size="lg"
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
                <Link href={ctaLink}>
                  {ctaText}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function FeatureSections() {
  const { t } = useTranslation();

  return (
    <>
      {/* Start your journey in minutes */}
      <FeatureSection
        icon={<Rocket className="h-12 w-12" style={{ color: '#ff4538' }} />}
        title={t('landing.features.startJourney.title') || 'Start your journey in minutes'}
        description={
          t('landing.features.startJourney.description') ||
          'Get started with your immigration application in just a few clicks. Our platform is production-ready and scales to handle your entire immigration journey.'
        }
        ctaText={t('landing.features.startJourney.cta') || 'Get Started'}
        ctaLink="/register"
      />

      {/* Fast processing that scales */}
      <FeatureSection
        icon={<Zap className="h-12 w-12" style={{ color: '#ff4538' }} />}
        title={t('landing.features.fastProcessing.title') || 'Fast processing that scales'}
        highlight={
          t('landing.features.fastProcessing.highlight') ||
          '94% success rate with streamlined processes'
        }
        description={
          t('landing.features.fastProcessing.description') ||
          'Our expert team processes applications efficiently with quick turnaround times. Track your case status in real-time and get updates instantly.'
        }
        ctaText={t('landing.features.fastProcessing.cta') || 'See how it works'}
        ctaLink="/register"
      />

      {/* Comprehensive immigration services */}
      <FeatureSection
        icon={<Sparkles className="h-12 w-12" style={{ color: '#ff4538' }} />}
        title={t('landing.features.comprehensive.title') || 'Comprehensive immigration services'}
        description={
          t('landing.features.comprehensive.description') ||
          'From student visas to work permits, family reunification to business visas—we offer complete immigration solutions tailored to your needs with expert guidance every step of the way.'
        }
        ctaText={t('landing.features.comprehensive.cta') || 'View all services'}
        ctaLink="/services"
      />

      {/* Expert guidance and support */}
      <FeatureSection
        icon={<Search className="h-12 w-12" style={{ color: '#ff4538' }} />}
        title={t('landing.features.expertGuidance.title') || 'Expert guidance and support'}
        description={
          t('landing.features.expertGuidance.description') ||
          'Our licensed immigration consultants provide personalized guidance throughout your entire journey. Get answers to your questions, document assistance, and professional support when you need it most.'
        }
        ctaText={t('landing.features.expertGuidance.cta') || 'Contact our experts'}
        ctaLink="/contact"
      />

      {/* Secure and confidential */}
      <FeatureSection
        icon={<Shield className="h-12 w-12" style={{ color: '#ff4538' }} />}
        title={t('landing.features.secure.title') || 'Secure and confidential processing'}
        description={
          t('landing.features.secure.description') ||
          'Your personal information and documents are protected with industry-leading security measures. We maintain strict confidentiality and comply with all data protection regulations.'
        }
        ctaText={t('landing.features.secure.cta') || 'Learn more'}
        ctaLink="/about"
      />
    </>
  );
}
