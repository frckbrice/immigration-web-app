'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CheckCircle2, Globe, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { values, team } from '@/components/about/api/data';

export const STATS = {
  years: '10+',
  clients: '500+',
  successRate: '94%',
  support: '24/7',
} as const;

export function AboutView() {
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: '#ff4538' }}
        ></div>
      </div>
    );
  }

  return (
    <>
      {/* Modern Bento Grid Hero Section */}
      <section
        className="relative overflow-hidden pt-20 pb-12 md:pt-24 md:pb-16"
        style={{ backgroundColor: '#091a24' }}
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Content */}
          <div className="text-center mb-12 md:mb-16 max-w-3xl mx-auto">
            <Badge
              variant="secondary"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium mb-6"
              style={{
                backgroundColor: 'rgba(255, 69, 56, 0.2)',
                color: '#ff4538',
                borderColor: 'rgba(255, 69, 56, 0.3)',
              }}
            >
              <Globe className="h-4 w-4" style={{ color: '#ff4538' }} />
              <span>{t('about.badge')}</span>
            </Badge>

            <h1
              className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6"
              style={{ color: '#ffffff' }}
            >
              {t('about.title')}
            </h1>

            <p
              className="text-lg md:text-xl leading-relaxed"
              style={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              {t('about.subtitle')}
            </p>
          </div>

          {/* Bento Grid Layout */}
          <div className="grid md:grid-cols-4 gap-4 md:gap-6">
            {/* Large Image Card - Takes 2 columns and 2 rows */}
            <div
              className="md:col-span-2 md:row-span-2 relative group overflow-hidden rounded-3xl border-2 shadow-xl hover:shadow-2xl transition-all duration-500"
              style={{
                borderColor: 'rgba(255, 255, 255, 0.1)',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 69, 56, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <div className="relative aspect-[4/3] md:aspect-auto md:h-full">
                <Image
                  src="/images/mpe_hero_1.jpeg"
                  alt={t('about.imageAlt')}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                {/* Floating Badge on Image */}
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-teal-600 dark:bg-teal-500 flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-white" />
                      </div>
                      <div className="text-white">
                        <div className="text-lg font-bold">{t('about.licensedBadge')}</div>
                        <div className="text-xs opacity-90">{t('about.licensedSince')}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards - Fill remaining grid */}
            <Card
              className="md:col-span-2 border-2 transition-all duration-300 hover:shadow-xl"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 69, 56, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <CardContent className="p-6 md:p-8 text-center">
                <div
                  className="text-5xl md:text-6xl font-extrabold mb-3"
                  style={{ color: '#ffffff' }}
                >
                  {STATS.years}
                </div>
                <div
                  className="text-sm md:text-base font-semibold uppercase tracking-wide"
                  style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                >
                  {t('about.statsYears')}
                </div>
              </CardContent>
            </Card>

            <Card
              className="border-2 transition-all duration-300 hover:shadow-xl"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#ff4538';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <CardContent className="p-6 text-center">
                <div
                  className="text-4xl md:text-5xl font-extrabold mb-2"
                  style={{ color: '#ff4538' }}
                >
                  {STATS.successRate}
                </div>
                <div
                  className="text-xs md:text-sm font-semibold uppercase tracking-wide"
                  style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                >
                  {t('about.statsSuccess')}
                </div>
              </CardContent>
            </Card>

            <Card
              className="border-2 transition-all duration-300 hover:shadow-xl"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#ff4538';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <CardContent className="p-6 text-center">
                <div
                  className="text-4xl md:text-5xl font-extrabold mb-2"
                  style={{ color: '#ff4538' }}
                >
                  {STATS.clients}
                </div>
                <div
                  className="text-xs md:text-sm font-semibold uppercase tracking-wide"
                  style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                >
                  {t('about.statsClients')}
                </div>
              </CardContent>
            </Card>

            {/* Mission Quick Summary - Spans 2 columns */}
            <Card
              className="md:col-span-2 border-2 transition-all duration-300 hover:shadow-xl"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 69, 56, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <CardContent className="p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(255, 69, 56, 0.2)' }}
                  >
                    <Shield className="h-6 w-6" style={{ color: '#ff4538' }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2" style={{ color: '#ffffff' }}>
                      {t('about.mission.licensedTitle')}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                    >
                      {t('about.mission.licensedDesc')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="md:col-span-2 border-2 transition-all duration-300 hover:shadow-xl"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#ff4538';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <CardContent className="p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(255, 69, 56, 0.2)' }}
                  >
                    <Zap className="h-6 w-6" style={{ color: '#ff4538' }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2" style={{ color: '#ffffff' }}>
                      {t('about.mission.fastTitle')}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                    >
                      {t('about.mission.fastDesc')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Mission Section - Simplified */}
      <section className="py-16 md:py-20" style={{ backgroundColor: '#091a24' }}>
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-6">
            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight"
              style={{ color: '#ffffff' }}
            >
              {t('about.mission.title')}
            </h2>
            <div
              className="h-1 w-20 rounded-full mx-auto"
              style={{ backgroundColor: '#ff4538' }}
            ></div>
            <p
              className="text-lg md:text-xl leading-relaxed max-w-3xl mx-auto"
              style={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              {t('about.mission.paragraph1')}
            </p>
            <p
              className="text-base md:text-lg leading-relaxed max-w-3xl mx-auto"
              style={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              {t('about.mission.paragraph2')}
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 md:py-20 lg:py-24" style={{ backgroundColor: '#091a24' }}>
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4"
              style={{ color: '#ffffff' }}
            >
              {t('about.values.title')}
            </h2>
            <p
              className="text-lg md:text-xl max-w-3xl mx-auto"
              style={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              {t('about.values.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <Card
                  key={index}
                  className="group relative overflow-hidden border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#ff4538';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  <CardHeader className="text-center pb-4">
                    <div className="relative mb-6">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300"
                        style={{ backgroundColor: 'rgba(255, 69, 56, 0.2)' }}
                      >
                        <Icon className="h-8 w-8" style={{ color: '#ff4538' }} />
                      </div>
                      {/* Glow Effect */}
                      <div
                        className="absolute inset-0 rounded-2xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300 mx-auto w-16 h-16"
                        style={{ backgroundColor: '#ff4538' }}
                      ></div>
                    </div>
                    <CardTitle
                      className="text-xl transition-colors duration-300"
                      style={{ color: '#ffffff' }}
                    >
                      {t(value.titleKey)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                    >
                      {t(value.descriptionKey)}
                    </p>
                  </CardContent>
                  {/* Hover Effect Gradient */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none"
                    style={{ backgroundColor: '#ff4538' }}
                  ></div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team Section - Enhanced Modern Cards */}
      <section className="py-16 md:py-20 lg:py-24 relative" style={{ backgroundColor: '#091a24' }}>
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <Badge
              variant="outline"
              className="mb-4 px-4 py-1.5"
              style={{
                borderColor: '#ff4538',
                color: '#ff4538',
                backgroundColor: 'rgba(255, 69, 56, 0.1)',
              }}
            >
              <span className="font-semibold">Our Experts</span>
            </Badge>
            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4"
              style={{ color: '#ffffff' }}
            >
              {t('about.team.title')}
            </h2>
            <p
              className="text-lg md:text-xl max-w-3xl mx-auto"
              style={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              {t('about.team.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {team.map((member, index) => {
              // Different muted, professional gradient for each team member
              const gradients = [
                'from-slate-600 to-slate-700 dark:from-slate-500 dark:to-slate-600',
                'from-indigo-600 to-blue-600 dark:from-indigo-500 dark:to-blue-500',
                'from-teal-600 to-cyan-600 dark:from-teal-500 dark:to-cyan-500',
              ];
              const gradient = gradients[index % gradients.length];

              return (
                <Card
                  key={index}
                  className="group relative overflow-hidden border-2 transition-all duration-500 hover:shadow-2xl"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#ff4538';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  {/* Animated gradient background on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500"
                    style={{ backgroundColor: '#ff4538' }}
                  ></div>

                  {/* Decorative top bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: '#ff4538' }}
                  ></div>

                  <CardContent className="relative pt-10 pb-8 px-6">
                    {/* Avatar with enhanced styling */}
                    <div className="relative mb-6 flex justify-center">
                      {/* Outer glow ring */}
                      <div
                        className="absolute inset-0 w-28 h-28 mx-auto rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-all duration-500 group-hover:scale-110"
                        style={{ backgroundColor: '#ff4538' }}
                      ></div>

                      {/* Avatar container with border */}
                      <div className="relative">
                        <div
                          className="w-28 h-28 rounded-full p-1 shadow-xl group-hover:scale-110 transition-transform duration-500"
                          style={{ backgroundColor: '#ff4538' }}
                        >
                          <div
                            className="w-full h-full rounded-full flex items-center justify-center"
                            style={{ backgroundColor: '#091a24' }}
                          >
                            <span className="text-3xl font-bold" style={{ color: '#ff4538' }}>
                              {member.avatar}
                            </span>
                          </div>
                        </div>

                        {/* Pulse ring on hover */}
                        <div
                          className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 group-hover:scale-125 transition-all duration-500"
                          style={{ backgroundColor: '#ff4538' }}
                        ></div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="text-center space-y-3">
                      <h3
                        className="text-xl font-bold transition-colors duration-300"
                        style={{ color: '#ffffff' }}
                      >
                        {t(member.nameKey)}
                      </h3>

                      <Badge
                        variant="secondary"
                        className="text-white border-0 shadow-md hover:shadow-lg transition-shadow duration-300"
                        style={{ backgroundColor: '#ff4538' }}
                      >
                        {t(member.roleKey)}
                      </Badge>

                      <p
                        className="text-sm leading-relaxed pt-2"
                        style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                      >
                        {t(member.descriptionKey)}
                      </p>
                    </div>

                    {/* Decorative bottom element */}
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ff4538] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 lg:py-24" style={{ backgroundColor: '#091a24' }}>
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card
            className="relative overflow-hidden border-2 shadow-2xl"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
            }}
          >
            {/* Background Gradient */}
            <div className="absolute inset-0" style={{ backgroundColor: '#091a24' }}></div>
            <div
              className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-10"
              style={{
                background: 'radial-gradient(circle, rgba(255, 69, 56, 0.3) 0%, transparent 70%)',
              }}
            ></div>
            <div
              className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl opacity-10"
              style={{
                background: 'radial-gradient(circle, rgba(255, 69, 56, 0.3) 0%, transparent 70%)',
              }}
            ></div>

            <CardContent className="relative p-8 md:p-12 lg:p-16 text-center">
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6"
                style={{ color: '#ffffff' }}
              >
                {t('about.cta.title')}
              </h2>
              <p
                className="text-lg md:text-xl mb-8 max-w-2xl mx-auto leading-relaxed"
                style={{ color: 'rgba(255, 255, 255, 0.7)' }}
              >
                {t('about.cta.description')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="text-base px-10 h-14 shadow-xl hover:shadow-2xl transition-all duration-300 group text-white"
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
                    {t('about.cta.getStarted')}
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-10 h-14 border-2 transition-all duration-300"
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
                  <Link href="/contact">{t('about.cta.contact')}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
