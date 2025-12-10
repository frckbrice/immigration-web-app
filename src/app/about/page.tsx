import { Suspense } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { AboutView } from '@/components/about/AboutView';

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-background">
      {/* Theme-aware Background - Redis style for dark mode */}
      <div className="fixed inset-0 -z-10">
        {/* Base background */}
        <div className="absolute inset-0 bg-background dark:bg-[#091a24]"></div>

        {/* Subtle animated gradient orbs - Theme-aware */}
        <div
          className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full blur-3xl opacity-20 dark:opacity-20"
          style={{
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--primary) 20%, transparent) 0%, transparent 70%)',
            animation: 'pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        ></div>

        <div
          className="absolute top-1/3 left-0 w-[600px] h-[600px] rounded-full blur-3xl opacity-15 dark:opacity-15"
          style={{
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--primary) 15%, transparent) 0%, transparent 70%)',
            animation: 'pulse 10s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            animationDelay: '2s',
          }}
        ></div>

        <div
          className="absolute bottom-0 right-1/4 w-[700px] h-[700px] rounded-full blur-3xl opacity-15 dark:opacity-15"
          style={{
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--primary) 15%, transparent) 0%, transparent 70%)',
            animation: 'pulse 12s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            animationDelay: '4s',
          }}
        ></div>
      </div>

      <Navbar />

      <main className="flex-1 w-full relative z-0">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          }
        >
          <AboutView />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
