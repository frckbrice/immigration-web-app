'use client';

import { useTranslation } from 'react-i18next';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function WorkPermitPage() {
  const { t } = useTranslation();

  const features = [
    t('landing.services.features.workPermit') || 'Work Permit Processing',
    t('landing.services.features.employerSupport') || 'Employer Support',
    t('landing.services.features.compliance') || 'Compliance Assistance',
  ];

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-background dark:bg-[#091a24]">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-background dark:bg-[#091a24]" />
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl opacity-20 dark:opacity-20"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--primary) 20%, transparent) 0%, transparent 70%)',
          }}
        />
      </div>

      <Navbar />

      <main className="flex-1 w-full relative z-0">
        <section className="relative py-16 md:py-24 lg:py-32 bg-background dark:bg-[#091a24]">
          <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link
              href="/services"
              className="inline-flex items-center gap-2 mb-8 transition-colors text-foreground/70 hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              <span suppressHydrationWarning>{t('common.back') || 'Back'}</span>
            </Link>

            <div className="text-center mb-12">
              <div className="inline-flex p-4 rounded-2xl mb-6 bg-primary/10">
                <Briefcase className="h-12 w-12 text-primary" />
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 text-foreground/90">
                <span suppressHydrationWarning>{t('landing.services.work') || 'Work Permit'}</span>
              </h1>
              <p className="text-xl md:text-2xl max-w-2xl mx-auto text-foreground/70">
                <span suppressHydrationWarning>
                  {t('landing.services.workDesc') ||
                    'Secure work permits for your international career'}
                </span>
              </p>
            </div>

            <Card className="mb-8 border-2 bg-card dark:bg-[rgba(255,255,255,0.03)] border-border">
              <CardHeader>
                <CardTitle className="text-2xl text-foreground/90">
                  <span suppressHydrationWarning>
                    {t('landing.services.work') || 'Work Permit'}
                  </span>
                </CardTitle>
                <CardDescription className="text-base text-foreground/70">
                  <span suppressHydrationWarning>
                    {t('landing.services.workDesc') ||
                      'Secure work permits for your international career'}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4 mb-8">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5 text-primary" />
                      <span className="text-base text-foreground/80">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col sm:flex-row gap-4">
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
        </section>
      </main>

      <Footer />
    </div>
  );
}
