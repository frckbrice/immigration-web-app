'use client';

import { useTranslation } from 'react-i18next';
import { Database, Zap, Handshake, Layers, Lock, Cloud } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  highlight: string;
  description: string;
}

function FeatureCard({ icon, title, highlight, description }: FeatureCardProps) {
  return (
    <Card
      className="group relative overflow-hidden border-2 transition-all duration-200 hover:shadow-lg"
      style={{
        backgroundColor: '#091a24',
        borderColor: 'rgba(255, 255, 255, 0.1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#ff4538';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
      }}
    >
      <CardHeader>
        <div className="flex items-start gap-4">
          <div
            className="p-3 rounded-xl transition-colors"
            style={{ backgroundColor: 'rgba(255, 69, 56, 0.1)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 69, 56, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 69, 56, 0.1)';
            }}
          >
            {icon}
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg md:text-xl mb-2 font-bold" style={{ color: '#ffffff' }}>
              {title}
            </CardTitle>
            <p className="text-base font-semibold" style={{ color: '#ff4538' }}>
              {highlight}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm md:text-base leading-[1.6] font-normal" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );
}

export function FeatureGrid() {
  const { t } = useTranslation();

  const features = [
    {
      icon: <Database className="h-6 w-6" style={{ color: '#ff4538' }} />,
      title: t('landing.featureGrid.expertTeam.title') || 'Expert Team',
      highlight: t('landing.featureGrid.expertTeam.highlight') || 'Licensed professionals',
      description:
        t('landing.featureGrid.expertTeam.description') ||
        'Our team of licensed immigration consultants brings years of experience and expertise to guide you through every step.',
    },
    {
      icon: <Zap className="h-6 w-6" style={{ color: '#ff4538' }} />,
      title: t('landing.featureGrid.successRate.title') || 'High Success Rate',
      highlight: t('landing.featureGrid.successRate.highlight') || '94% success rate',
      description:
        t('landing.featureGrid.successRate.description') ||
        'With thousands of successful visa applications processed, we maintain one of the highest success rates in the industry.',
    },
    {
      icon: <Handshake className="h-6 w-6" style={{ color: '#ff4538' }} />,
      title: t('landing.featureGrid.support.title') || '24/7 Support',
      highlight: t('landing.featureGrid.support.highlight') || 'Always here for you',
      description:
        t('landing.featureGrid.support.description') ||
        'Our dedicated support team is available around the clock to answer your questions and provide guidance when you need it.',
    },
    {
      icon: <Layers className="h-6 w-6" style={{ color: '#ff4538' }} />,
      title: t('landing.featureGrid.documentManagement.title') || 'Document Management',
      highlight: t('landing.featureGrid.documentManagement.highlight') || 'Secure & organized',
      description:
        t('landing.featureGrid.documentManagement.description') ||
        'Keep all your immigration documents organized and secure in one place. Access them anytime, anywhere.',
    },
    {
      icon: <Lock className="h-6 w-6" style={{ color: '#ff4538' }} />,
      title: t('landing.featureGrid.security.title') || 'Secure & Confidential',
      highlight: t('landing.featureGrid.security.highlight') || 'Your privacy matters',
      description:
        t('landing.featureGrid.security.description') ||
        'We protect your personal information with industry-leading security measures and maintain strict confidentiality.',
    },
    {
      icon: <Cloud className="h-6 w-6" style={{ color: '#ff4538' }} />,
      title: t('landing.featureGrid.globalReach.title') || 'Global Reach',
      highlight: t('landing.featureGrid.globalReach.highlight') || '50+ countries',
      description:
        t('landing.featureGrid.globalReach.description') ||
        'Extensive network across multiple countries and immigration systems. We help you navigate immigration worldwide.',
    },
  ];

  return (
    <section className="relative py-8 md:py-12 lg:py-16" style={{ backgroundColor: '#091a24' }}>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 md:mb-10">
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight mb-4"
            style={{ color: '#ffffff' }}
          >
            <span suppressHydrationWarning>
              {t('landing.featureGrid.title') || 'Why Choose Us'}
            </span>
          </h2>
          <p
            className="text-base md:text-lg max-w-3xl mx-auto leading-[1.7] font-normal"
            style={{ color: 'rgba(255, 255, 255, 0.75)' }}
          >
            <span suppressHydrationWarning>
              {t('landing.featureGrid.subtitle') ||
                'Discover what makes us the trusted choice for immigration services'}
            </span>
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
