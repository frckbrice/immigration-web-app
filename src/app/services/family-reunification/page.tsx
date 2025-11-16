'use client';

import { useTranslation } from 'react-i18next';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function FamilyReunificationPage() {
  const { t } = useTranslation();

  const features = [
    t('landing.services.features.sponsorship') || 'Sponsorship Guidance',
    t('landing.services.features.familyVisa') || 'Family Visa Processing',
    t('landing.services.features.reunification') || 'Reunification Support',
  ];

  return (
    <div
      className="flex flex-col min-h-screen relative overflow-hidden"
      style={{ backgroundColor: '#091a24' }}
    >
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0" style={{ backgroundColor: '#091a24' }} />
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(255, 69, 56, 0.2) 0%, transparent 70%)',
          }}
        />
      </div>

      <Navbar />

      <main className="flex-1 w-full relative z-0">
        <section
          className="relative py-16 md:py-24 lg:py-32"
          style={{ backgroundColor: '#091a24' }}
        >
          <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link
              href="/services"
              className="inline-flex items-center gap-2 mb-8 transition-colors"
              style={{ color: 'rgba(255, 255, 255, 0.7)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ff4538';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              <span suppressHydrationWarning>{t('common.back') || 'Back'}</span>
            </Link>

            <div className="text-center mb-12">
              <div
                className="inline-flex p-4 rounded-2xl mb-6"
                style={{ backgroundColor: 'rgba(255, 69, 56, 0.1)' }}
              >
                <Users className="h-12 w-12" style={{ color: '#ff4538' }} />
              </div>
              <h1
                className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4"
                style={{ color: '#ffffff' }}
              >
                <span suppressHydrationWarning>
                  {t('landing.services.family') || 'Family Reunification'}
                </span>
              </h1>
              <p
                className="text-xl md:text-2xl max-w-2xl mx-auto"
                style={{ color: 'rgba(255, 255, 255, 0.7)' }}
              >
                <span suppressHydrationWarning>
                  {t('landing.services.familyDesc') ||
                    'Reunite with your loved ones through family sponsorship'}
                </span>
              </p>
            </div>

            <Card
              className="mb-8 border-2"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <CardHeader>
                <CardTitle className="text-2xl" style={{ color: '#ffffff' }}>
                  <span suppressHydrationWarning>
                    {t('landing.services.family') || 'Family Reunification'}
                  </span>
                </CardTitle>
                <CardDescription
                  className="text-base"
                  style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                >
                  <span suppressHydrationWarning>
                    {t('landing.services.familyDesc') ||
                      'Reunite with your loved ones through family sponsorship'}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4 mb-8">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle2
                        className="h-5 w-5 flex-shrink-0 mt-0.5"
                        style={{ color: '#ff4538' }}
                      />
                      <span className="text-base" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    size="lg"
                    className="text-white"
                    style={{ backgroundColor: '#ff4538' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#ff5c50';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ff4538';
                    }}
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
