import { Suspense } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { LandingView } from '@/components/landing/LandingView';

// PERFORMANCE: Add metadata for SEO
export const metadata = {
  title: 'Patrick Travel Services - Immigration Management Platform',
  description:
    'Complete immigration services management platform for streamlined case management, document processing, and client communications',
};

// PERFORMANCE: Use auto for better client-side interactivity
export const dynamic = 'auto';

export default function HomePage() {
  return (
    <div
      className="flex flex-col min-h-screen relative overflow-hidden"
      style={{ backgroundColor: '#091a24' }}
    >
      {/* PERFORMANCE: Optimized gradient background */}
      <div className="fixed inset-0 -z-10" style={{ willChange: 'transform' }}>
        {/* Base gradient layer - Redis Cloud background */}
        <div className="absolute inset-0" style={{ backgroundColor: '#091a24' }} />

        {/* PERFORMANCE: Reduced blur and opacity for better rendering */}
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(255, 69, 56, 0.15) 0%, transparent 70%)',
            filter: 'blur(80px)',
            willChange: 'opacity',
          }}
        />

        <div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(255, 69, 56, 0.1) 0%, transparent 70%)',
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
