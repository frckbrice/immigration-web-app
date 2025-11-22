'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Testimonial {
  name: string;
  role: string;
  location: string;
  content: string;
  rating: number;
  avatarInitials: string;
  avatarSrc: string;
  avatarColor: string;
  gradient: string;
}

export function Testimonials() {
  const { t } = useTranslation();

  const testimonials = useMemo<Testimonial[]>(
    () => [
      {
        name: t('landing.testimonials.name1') || 'Micheal Johnson',
        role: t('landing.testimonials.role1') || 'Student Visa',
        location: t('landing.testimonials.location1') || 'Toronto, Canada',
        content: t('landing.testimonials.testimonial1') || '',
        rating: 5,
        avatarInitials: 'SJ',
        avatarSrc: '/avatars/1.png',
        avatarColor: 'bg-blue-600',
        gradient: 'from-blue-600/30 via-cyan-500/20 to-transparent',
      },
      {
        name: t('landing.testimonials.name2') || 'Akamba Bekono',
        role: t('landing.testimonials.role2') || 'Work Permit',
        location: t('landing.testimonials.location2') || 'London, UK',
        content: t('landing.testimonials.testimonial2') || '',
        rating: 5,
        avatarInitials: 'MC',
        avatarSrc: '/avatars/4.png',
        avatarColor: 'bg-emerald-600',
        gradient: 'from-emerald-500/25 via-sky-500/20 to-transparent',
      },
      {
        name: t('landing.testimonials.name3') || 'Emma Williams',
        role: t('landing.testimonials.role3') || 'Family Reunification',
        location: t('landing.testimonials.location3') || 'Sydney, Australia',
        content: t('landing.testimonials.testimonial3') || '',
        rating: 5,
        avatarInitials: 'EW',
        avatarSrc: '/avatars/6.png',
        avatarColor: 'bg-purple-600',
        gradient: 'from-purple-500/25 via-pink-500/15 to-transparent',
      },
      {
        name: t('landing.testimonials.name4') || 'Tchatchouang Ebenezer',
        role: t('landing.services.business') || 'Business Visa',
        location: t('landing.testimonials.location2') || 'London, UK',
        content:
          `${t('landing.testimonials.testimonial2')} ${t('landing.whyChooseUs.features.efficiency.description')}` ||
          '',
        rating: 5,
        avatarInitials: 'DR',
        avatarSrc: '/avatars/9.png',
        avatarColor: 'bg-orange-600',
        gradient: 'from-orange-500/25 via-amber-400/20 to-transparent',
      },
      {
        name: t('landing.testimonials.name5') || 'Osseni Adamou',
        role: t('landing.services.family') || 'Family Reunification',
        location: t('landing.testimonials.location3') || 'Sydney, Australia',
        content:
          `${t('landing.testimonials.testimonial3')} ${t('landing.whyChooseUs.features.support.description')}` ||
          '',
        rating: 5,
        avatarInitials: 'CM',
        avatarSrc: '/avatars/12.png',
        avatarColor: 'bg-pink-600',
        gradient: 'from-pink-500/25 via-rose-400/15 to-transparent',
      },
    ],
    [t]
  );

  const heroTestimonial = testimonials[0];
  const mosaicTestimonials = testimonials.slice(1);

  const stats = [
    {
      value: t('landing.testimonials.statsClientsValue') || '500+',
      label: t('landing.hero.clients') || 'Clients',
      caption: t('landing.testimonials.rating') || '5.0 Rating',
    },
    {
      value: t('landing.hero.successRateValue') || '94%',
      label: t('landing.hero.successRate') || 'Success Rate',
      caption: t('landing.whyChooseUs.features.success.description') || '',
    },
    {
      value: t('landing.testimonials.statsExperienceValue') || '10+',
      label: t('landing.hero.years') || 'Years Experience',
      caption: t('landing.whyChooseUs.features.excellence.description') || '',
    },
  ];

  return (
    <section
      className="relative py-8 md:py-12 lg:py-16 overflow-hidden"
      style={{ backgroundColor: '#091a24' }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-10 left-[-60px] w-72 h-72 bg-linear-to-trr from-purple-500/20 via-pink-500/20 to-transparent blur-3xl animate-pulse opacity-30"></div>
        <div className="absolute bottom-0 right-[-40px] w-80 h-80 bg-linear-to-trl from-cyan-500/20 via-blue-500/20 to-transparent blur-3xl animate-pulse opacity-30"></div>
      </div>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-8 md:mb-10">
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight mb-4"
            style={{ color: '#ffffff' }}
          >
            <span suppressHydrationWarning>
              {t('landing.testimonials.title') || 'What Our Clients Say'}
            </span>
          </h2>
          <p
            className="text-base md:text-lg max-w-3xl mx-auto leading-[1.7] font-normal"
            style={{ color: 'rgba(255, 255, 255, 0.75)' }}
          >
            <span suppressHydrationWarning>
              {t('landing.testimonials.subtitle') ||
                "Real stories from people we've helped achieve their immigration goals"}
            </span>
          </p>
        </div>

        {/* Testimonials Layout */}
        <div className="relative">
          {/* Mobile: Horizontal Scrollable */}
          <div className="block lg:hidden">
            <div
              className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 scrollbar-hide"
              style={{
                scrollBehavior: 'smooth',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <div className="flex gap-4 sm:gap-6 min-w-max sm:min-w-0 pb-2">
                {mosaicTestimonials.map((testimonial) => (
                  <div
                    key={testimonial.name}
                    className="flex-shrink-0 w-[85vw] sm:w-auto sm:flex-1"
                  >
                    <TestimonialCard testimonial={testimonial} />
                  </div>
                ))}
                <div className="flex-shrink-0 w-[85vw] sm:w-auto sm:flex-1">
                  <SpotlightCard testimonial={heroTestimonial} />
                </div>
              </div>
            </div>
          </div>

          {/* Desktop: Grid Layout */}
          <div className="hidden lg:grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="grid gap-6 sm:grid-cols-2">
              {mosaicTestimonials.map((testimonial) => (
                <TestimonialCard key={testimonial.name} testimonial={testimonial} />
              ))}
            </div>
            <SpotlightCard testimonial={heroTestimonial} />
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-8 md:mt-10 grid sm:grid-cols-3 gap-3 md:gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="relative overflow-hidden rounded-xl border p-4 md:p-5 text-center"
              style={{
                backgroundColor: '#091a24',
                borderColor: 'rgba(255, 69, 56, 0.3)',
                borderWidth: '1px',
                borderStyle: 'solid',
              }}
            >
              <div className="absolute inset-0 bg-linear-to-tr from-[rgba(255,69,56,0.05)] via-transparent to-[rgba(255,69,56,0.05)]"></div>
              <div className="relative space-y-1.5 md:space-y-2">
                <p className="text-2xl md:text-3xl font-black" style={{ color: '#ff4538' }}>
                  {stat.value}
                </p>
                <p
                  className="text-xs md:text-sm font-semibold uppercase tracking-wide"
                  style={{ color: 'rgba(255, 255, 255, 0.9)' }}
                >
                  <span suppressHydrationWarning>{stat.label}</span>
                </p>
                <p className="text-[10px] md:text-xs" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  <span suppressHydrationWarning>{stat.caption}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <Card
      className="relative overflow-hidden shadow-lg transition-transform duration-300 hover:-translate-y-1"
      style={{
        backgroundColor: '#091a24',
        borderColor: 'rgba(255, 69, 56, 0.3)',
        borderWidth: '1px',
        borderStyle: 'solid',
      }}
    >
      <div
        className={`absolute inset-0 opacity-20 bg-linear-to-br ${testimonial.gradient} pointer-events-none`}
        aria-hidden
      />
      <CardContent className="relative space-y-4 p-5 md:p-6">
        <Quote
          className="h-8 w-8 md:h-10 md:w-10"
          style={{ color: '#ff4538' }}
          aria-hidden="true"
        />
        <p
          className="text-sm md:text-base leading-relaxed"
          style={{ color: 'rgba(255, 255, 255, 0.8)' }}
        >
          <span suppressHydrationWarning>&ldquo;{testimonial.content}&rdquo;</span>
        </p>
        <div
          className="flex items-center gap-3 md:gap-4 pt-3 md:pt-4 border-t"
          style={{ borderColor: 'rgba(255, 69, 56, 0.2)' }}
        >
          <Avatar className="h-12 w-12 md:h-16 md:w-16 ring-2 ring-[rgba(255,69,56,0.3)]">
            <AvatarImage
              src={testimonial.avatarSrc}
              alt={testimonial.name}
              loading="lazy"
              decoding="async"
              className="object-cover"
            />
            <AvatarFallback
              className={`${testimonial.avatarColor} text-white text-lg font-semibold`}
            >
              {testimonial.avatarInitials}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-0.5 md:space-y-1">
            <p className="font-semibold text-sm md:text-base" style={{ color: '#ffffff' }}>
              {testimonial.name}
            </p>
            <p className="text-xs md:text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              <span suppressHydrationWarning>{testimonial.role}</span>
            </p>
            <p className="text-[10px] md:text-xs" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              <span suppressHydrationWarning>{testimonial.location}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SpotlightCard({ testimonial }: { testimonial: Testimonial }) {
  const { t } = useTranslation();
  return (
    <Card
      className="relative isolate overflow-hidden text-white shadow-[0_20px_80px_rgba(15,23,42,0.55)]"
      style={{
        backgroundColor: '#091a24',
        borderColor: '#ff4538',
        borderWidth: '1px',
        borderStyle: 'solid',
      }}
    >
      <div className="absolute inset-[-40%] bg-linear-to-br from-blue-500/20 via-cyan-500/15 to-purple-500/15 blur-3xl opacity-40" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,69,56,0.1),transparent_70%)]" />
      <CardContent className="relative flex h-full flex-col gap-4 md:gap-6 p-6 md:p-8 lg:p-10">
        <div className="flex items-center gap-3 text-yellow-300">
          <div className="flex items-center gap-1">
            {Array.from({ length: testimonial.rating }).map((_, index) => (
              <Star key={index} className="h-5 w-5 fill-yellow-300 text-yellow-300" />
            ))}
          </div>
          <span className="text-sm font-semibold tracking-wide uppercase text-yellow-200/80">
            {t('landing.testimonials.badge') || 'Testimonials'}
          </span>
        </div>
        <Quote
          className="h-12 w-12 md:h-16 md:w-16"
          style={{ color: 'rgba(255, 69, 56, 0.3)' }}
          aria-hidden="true"
        />
        <p
          className="text-base md:text-lg lg:text-xl leading-relaxed font-medium"
          style={{ color: 'rgba(255, 255, 255, 0.9)' }}
        >
          <span suppressHydrationWarning>&ldquo;{testimonial.content}&rdquo;</span>
        </p>
        <div
          className="flex items-center gap-3 md:gap-4 pt-4 md:pt-6 border-t"
          style={{ borderColor: 'rgba(255, 69, 56, 0.2)' }}
        >
          <Avatar className="h-16 w-16 md:h-20 md:w-20 ring-2 md:ring-4 ring-[rgba(255,69,56,0.3)]">
            <AvatarImage
              src={testimonial.avatarSrc}
              alt={testimonial.name}
              loading="lazy"
              decoding="async"
              className="object-cover"
            />
            <AvatarFallback
              className={`${testimonial.avatarColor} text-white text-xl font-semibold`}
            >
              {testimonial.avatarInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-base md:text-lg font-semibold" style={{ color: '#ffffff' }}>
              {testimonial.name}
            </p>
            <p className="text-xs md:text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              <span suppressHydrationWarning>{testimonial.role}</span>
            </p>
            <p className="text-[10px] md:text-xs" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              <span suppressHydrationWarning>{testimonial.location}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
