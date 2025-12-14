import { Suspense } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { LandingView } from '@/components/landing/LandingView';

// PERFORMANCE: Force dynamic to prevent static generation issues with client components
// Note: metadata export is removed to avoid conflict with force-dynamic rendering mode
export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-background dark:bg-[#14303d]">
      {/* PERFORMANCE: Optimized gradient background */}
      <div className="fixed inset-0 -z-10" style={{ willChange: 'transform' }}>
        {/* Base gradient layer - Redis style for dark mode, theme-aware for light */}
        <div className="absolute inset-0 bg-background dark:bg-[#14303d]" />

        {/* PERFORMANCE: Reduced blur and opacity for better rendering - Theme-aware gradients */}
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-20 dark:opacity-20"
          style={{
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--primary) 15%, transparent) 0%, transparent 70%)',
            filter: 'blur(80px)',
            willChange: 'opacity',
          }}
        />

        <div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-15 dark:opacity-15"
          style={{
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--primary) 10%, transparent) 0%, transparent 70%)',
            filter: 'blur(80px)',
            willChange: 'opacity',
          }}
        />
      </div>

      <Navbar />
      <main className="flex-1 w-full relative z-0">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[60vh]" aria-label="Loading">
              <div
                className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"
                role="status"
              >
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          }
        >
          <LandingView />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
