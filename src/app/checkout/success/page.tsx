'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const paymentIntent = searchParams.get('payment_intent');

  useEffect(() => {
    // Redirect to dashboard after 3 seconds
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#091a24' }}>
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card
          className="max-w-md w-full text-center"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <CardContent className="p-8">
            <div className="mb-6">
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4" style={{ color: '#ff4538' }} />
              <h1 className="text-2xl font-bold mb-2" style={{ color: '#ffffff' }}>
                Payment Successful!
              </h1>
              <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Your subscription has been activated. Redirecting to dashboard...
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 mb-6">
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#ff4538' }} />
              <span className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Redirecting...
              </span>
            </div>
            <Button
              asChild
              className="w-full text-white"
              style={{ backgroundColor: '#ff4538' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#ff5c50';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ff4538';
              }}
            >
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
