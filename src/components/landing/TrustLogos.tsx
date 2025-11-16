'use client';

import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Shield, Building2, Globe, Award, CheckCircle2, FileCheck } from 'lucide-react';

export function TrustLogos() {
  const { t } = useTranslation();

  // Immigration authorities with icons and descriptions
  const authorities = [
    {
      name: t('landing.trust.logo1') || 'IRCC',
      fullName: 'Immigration, Refugees and Citizenship Canada',
      icon: Shield,
      country: 'Canada',
    },
    {
      name: t('landing.trust.logo2') || 'CIC',
      fullName: 'Citizenship and Immigration Canada',
      icon: Building2,
      country: 'Canada',
    },
    {
      name: t('landing.trust.logo3') || 'USCIS',
      fullName: 'U.S. Citizenship and Immigration Services',
      icon: Globe,
      country: 'United States',
    },
    {
      name: t('landing.trust.logo4') || 'Home Office UK',
      fullName: 'UK Home Office',
      icon: Award,
      country: 'United Kingdom',
    },
    {
      name: t('landing.trust.logo5') || 'Immigration NZ',
      fullName: 'Immigration New Zealand',
      icon: CheckCircle2,
      country: 'New Zealand',
    },
    {
      name: t('landing.trust.logo6') || 'Australia Immigration',
      fullName: 'Department of Home Affairs Australia',
      icon: FileCheck,
      country: 'Australia',
    },
  ];

  // Duplicate the array for seamless infinite scroll
  const duplicatedAuthorities = [...authorities, ...authorities];

  return (
    <section
      className="relative py-16 md:py-20 overflow-hidden"
      style={{ backgroundColor: '#091a24' }}
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-semibold mb-2" style={{ color: '#ffffff' }}>
            <span suppressHydrationWarning>
              {t('landing.trust.title') || 'Trusted by immigration authorities worldwide'}
            </span>
          </h2>
          <p className="text-sm md:text-base mt-2" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            <span suppressHydrationWarning>
              {t('landing.trust.subtitle') ||
                'Recognized partners with official immigration agencies'}
            </span>
          </p>
        </div>

        {/* Marquee Container */}
        <div className="relative w-full overflow-hidden">
          {/* Gradient overlays for fade effect */}
          <div
            className="absolute left-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
            style={{
              background: 'linear-gradient(to right, #091a24 0%, transparent 100%)',
            }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
            style={{
              background: 'linear-gradient(to left, #091a24 0%, transparent 100%)',
            }}
          />

          {/* Scrolling Container */}
          <div className="flex animate-scroll">
            {duplicatedAuthorities.map((authority, index) => {
              const Icon = authority.icon;
              return (
                <div
                  key={`${authority.name}-${index}`}
                  className="flex-shrink-0 mx-4"
                  style={{ width: '280px' }}
                >
                  <Card
                    className="h-full transition-all duration-300 hover:scale-105 hover:shadow-xl"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      borderWidth: '1px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#ff4538';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 69, 56, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                    }}
                  >
                    <div className="p-6 flex flex-col items-center text-center space-y-4">
                      {/* Icon */}
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-300"
                        style={{ backgroundColor: 'rgba(255, 69, 56, 0.1)' }}
                      >
                        <Icon className="h-8 w-8" style={{ color: '#ff4538' }} />
                      </div>

                      {/* Authority Name */}
                      <div>
                        <h3 className="text-lg font-bold mb-1" style={{ color: '#ffffff' }}>
                          {authority.name}
                        </h3>
                        <p className="text-xs mb-2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                          {authority.fullName}
                        </p>
                        <p className="text-xs font-medium" style={{ color: '#ff4538' }}>
                          {authority.country}
                        </p>
                      </div>

                      {/* Verified Badge */}
                      <div
                        className="flex items-center gap-1 text-xs"
                        style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                      >
                        <CheckCircle2 className="h-3 w-3" style={{ color: '#ff4538' }} />
                        <span>Verified Partner</span>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CSS Animation */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes trust-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-scroll {
          display: flex;
          animation: trust-scroll 30s linear infinite;
          width: fit-content;
        }

        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `,
        }}
      />
    </section>
  );
}
