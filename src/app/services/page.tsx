'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Briefcase,
  GraduationCap,
  Users,
  Building2,
  FileText,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export default function ServicesPage() {
  const { t } = useTranslation();

  const services = [
    {
      icon: GraduationCap,
      title: t('landing.services.student') || 'Student Visa',
      description:
        t('landing.services.studentDesc') ||
        'Comprehensive support for student visa applications to study abroad.',
      features: [
        t('landing.services.features.visaApplication') || 'Visa Application Assistance',
        t('landing.services.features.documentation') || 'Documentation Support',
        t('landing.services.features.consultation') || 'Expert Consultation',
      ],
      href: '/services/student-visa',
    },
    {
      icon: Briefcase,
      title: t('landing.services.work') || 'Work Permit',
      description:
        t('landing.services.workDesc') ||
        'Professional guidance for work permit and employment visa applications.',
      features: [
        t('landing.services.features.workPermit') || 'Work Permit Processing',
        t('landing.services.features.employerSupport') || 'Employer Support',
        t('landing.services.features.compliance') || 'Compliance Assistance',
      ],
      href: '/services/work-permit',
    },
    {
      icon: Users,
      title: t('landing.services.family') || 'Family Reunification',
      description:
        t('landing.services.familyDesc') ||
        'Help reunite families through sponsorship and family visa programs.',
      features: [
        t('landing.services.features.sponsorship') || 'Sponsorship Guidance',
        t('landing.services.features.familyVisa') || 'Family Visa Processing',
        t('landing.services.features.reunification') || 'Reunification Support',
      ],
      href: '/services/family-reunification',
    },
    {
      icon: Building2,
      title: t('landing.services.business') || 'Business Visa',
      description:
        t('landing.services.businessDesc') ||
        'Assistance with business visa applications for entrepreneurs and investors.',
      features: [
        t('landing.services.features.businessVisa') || 'Business Visa Processing',
        t('landing.services.features.investment') || 'Investment Guidance',
        t('landing.services.features.businessSupport') || 'Business Support',
      ],
      href: '/services/business-visa',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-background dark:bg-[#091a24]">
      {/* Theme-aware Background - Redis style for dark mode */}
      <div className="fixed inset-0 -z-10">
        {/* Base background */}
        <div className="absolute inset-0 bg-background dark:bg-[#091a24]"></div>

        {/* Subtle animated gradient orbs - Theme-aware */}
        <div
          className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full blur-3xl opacity-20 dark:opacity-20"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--primary) 20%, transparent) 0%, transparent 70%)',
            animation: 'pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        ></div>

        <div
          className="absolute top-1/3 left-0 w-[600px] h-[600px] rounded-full blur-3xl opacity-15 dark:opacity-15"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--primary) 15%, transparent) 0%, transparent 70%)',
            animation: 'pulse 10s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            animationDelay: '2s',
          }}
        ></div>

        <div
          className="absolute bottom-0 right-1/4 w-[700px] h-[700px] rounded-full blur-3xl opacity-15 dark:opacity-15"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--primary) 15%, transparent) 0%, transparent 70%)',
            animation: 'pulse 12s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            animationDelay: '4s',
          }}
        ></div>
      </div>

      <Navbar />

      <main className="flex-1 w-full relative z-0">
        <section className="relative py-16 md:py-24 lg:py-32 bg-background dark:bg-[#091a24]">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="text-center mb-12 md:mb-16">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 text-foreground/90">
                <span suppressHydrationWarning>
                  {t('landing.services.title') || 'Our Services'}
                </span>
              </h1>
              <p className="text-lg md:text-xl max-w-3xl mx-auto text-foreground/70">
                <span suppressHydrationWarning>
                  {t('landing.services.subtitle') ||
                    'Comprehensive immigration services to help you achieve your goals.'}
                </span>
              </p>
            </div>

            {/* Services Grid */}
            <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
              {services.map((service, index) => {
                const Icon = service.icon;
                return (
                  <Card
                    key={index}
                    className="group relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl bg-card dark:bg-[rgba(255,255,255,0.03)] border-border hover:border-primary"
                  >
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl transition-colors flex-shrink-0 bg-primary/10 group-hover:bg-primary/20">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-2 text-foreground/90">
                            {service.title}
                          </CardTitle>
                          <CardDescription className="text-base text-foreground/70">
                            {service.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 mb-6">
                        {service.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" />
                            <span className="text-sm text-foreground/70">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant="outline"
                        className="w-full transition-all duration-200 text-primary border-primary hover:bg-primary/10"
                        asChild
                      >
                        <Link href={service.href}>
                          {t('landing.services.learnMore') || 'Learn More'}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* CTA Section */}
            <div className="mt-16 text-center">
              <Card className="max-w-3xl mx-auto border-2 bg-card dark:bg-[rgba(255,255,255,0.03)] border-border">
                <CardContent className="p-8 md:p-12">
                  <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground/90">
                    <span suppressHydrationWarning>
                      {t('landing.services.ctaTitle') || 'Ready to Get Started?'}
                    </span>
                  </h2>
                  <p className="text-lg mb-6 text-foreground/70">
                    <span suppressHydrationWarning>
                      {t('landing.services.ctaDescription') ||
                        'Contact us today to discuss your immigration needs.'}
                    </span>
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                      size="lg"
                      className="text-primary-foreground bg-primary hover:bg-primary/90"
                      asChild
                    >
                      <Link href="/contact">
                        {t('landing.services.contactUs') || 'Contact Us'}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="transition-all duration-200 text-primary border-primary hover:bg-primary/10"
                      asChild
                    >
                      <Link href="/register">
                        {t('landing.services.getStarted') || 'Get Started'}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
