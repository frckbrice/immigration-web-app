'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/features/auth/store';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/utils/axios';
import { isValidTier, getTierPrice, getTierName, SubscriptionTier } from '@/lib/utils/payment';
import { logger } from '@/lib/utils/logger';
import { sanitizeMessage } from '@/lib/utils/sanitize';
import { toast } from 'sonner';
import Link from 'next/link';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface CheckoutFormProps {
  tier: SubscriptionTier;
  clientSecret: string;
  amount: number;
}

function CheckoutForm({ tier, clientSecret, amount }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(
          submitError.message || t('landing.checkout.page.errorOccurred') || 'An error occurred'
        );
        setIsProcessing(false);
        return;
      }

      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(
          confirmError.message || t('landing.checkout.page.paymentFailed') || 'Payment failed'
        );
        setIsProcessing(false);
      } else {
        // Payment succeeded, redirect to dashboard
        toast.success(
          sanitizeMessage(
            t('landing.checkout.page.paymentSuccessful') ||
              'Payment successful! Redirecting to dashboard...'
          )
        );
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      }
    } catch (err) {
      setError(
        t('landing.checkout.page.unexpectedError') ||
          'An unexpected error occurred. Please try again.'
      );
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      {error && (
        <div
          className="p-4 rounded-lg"
          style={{
            backgroundColor: 'rgba(255, 69, 56, 0.1)',
            borderColor: '#ff4538',
            borderWidth: '1px',
          }}
        >
          <p className="text-sm" style={{ color: '#ff4538' }}>
            {error}
          </p>
        </div>
      )}
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full text-white"
        style={{ backgroundColor: '#ff4538' }}
        onMouseEnter={(e) => {
          if (!isProcessing) {
            e.currentTarget.style.backgroundColor = '#ff5c50';
          }
        }}
        onMouseLeave={(e) => {
          if (!isProcessing) {
            e.currentTarget.style.backgroundColor = '#ff4538';
          }
        }}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span suppressHydrationWarning>
              {t('landing.checkout.page.processing') || 'Processing...'}
            </span>
          </>
        ) : (
          `${t('landing.checkout.page.pay') || 'Pay'} $${amount.toLocaleString()}`
        )}
      </Button>
    </form>
  );
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { t } = useTranslation();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tierParam = searchParams.get('tier') || '';

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=/checkout?tier=${tierParam}`);
      return;
    }

    // Wait for auth to be ready
    if (authLoading || !isAuthenticated) {
      return;
    }

    // Validate tier
    if (!tierParam || !isValidTier(tierParam)) {
      setError(
        t('landing.checkout.page.invalidTier') ||
          'Invalid subscription tier. Please select a valid plan.'
      );
      setLoading(false);
      return;
    }

    // Check if user already paid
    const checkExistingPayment = async () => {
      try {
        const statusResponse = await apiClient.get('/api/payments/status');
        if (statusResponse.data.success) {
          const paymentData = statusResponse.data.data;
          if (paymentData.hasPaid || paymentData.bypassed) {
            // User already paid, redirect to dashboard
            router.push('/dashboard');
            return;
          }
        }
      } catch (err) {
        // Continue to create payment intent if status check fails
        logger.error('Failed to check payment status', err);
      }

      // Create payment intent
      try {
        const response = await apiClient.post('/api/payments/checkout', {
          tier: tierParam,
        });

        const { clientSecret: secret, amount } = response.data.data;
        setClientSecret(secret);
        setLoading(false);
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.error || err.message || 'Failed to initialize payment';
        setError(errorMessage);
        setLoading(false);
      }
    };

    checkExistingPayment();
  }, [isAuthenticated, authLoading, tierParam, router]);

  if (authLoading || loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#091a24' }}
      >
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" style={{ color: '#ff4538' }} />
          <p className="text-lg" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            <span suppressHydrationWarning>
              {t('landing.checkout.page.loading') || 'Loading checkout...'}
            </span>
          </p>
        </div>
      </div>
    );
  }

  if (error || !isValidTier(tierParam)) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#091a24' }}
      >
        <Card
          className="max-w-md w-full"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <CardContent className="p-6 text-center">
            <p className="text-lg mb-4" style={{ color: '#ff4538' }}>
              {error || t('landing.checkout.page.invalidTier') || 'Invalid tier'}
            </p>
            <Button
              asChild
              variant="outline"
              style={{
                borderColor: '#ff4538',
                color: '#ff4538',
                backgroundColor: 'transparent',
              }}
            >
              <Link href="/">
                <span suppressHydrationWarning>
                  {t('landing.checkout.page.returnToHome') || 'Return to Home'}
                </span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tier = tierParam as SubscriptionTier;
  const tierName = getTierName(tier);
  const tierPrice = getTierPrice(tier);

  if (!clientSecret) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#091a24' }}
      >
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" style={{ color: '#ff4538' }} />
          <p className="text-lg" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            <span suppressHydrationWarning>
              {t('landing.checkout.page.initializing') || 'Initializing payment...'}
            </span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#091a24' }}>
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl">
          <Button
            variant="ghost"
            className="mb-6"
            style={{ color: 'rgba(255, 255, 255, 0.8)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ff4538';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
            }}
            asChild
          >
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span suppressHydrationWarning>
                {t('landing.checkout.page.backToHome') || 'Back to Home'}
              </span>
            </Link>
          </Button>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Order Summary */}
            <Card
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <CardHeader>
                <CardTitle style={{ color: '#ffffff' }}>
                  <span suppressHydrationWarning>
                    {t('landing.checkout.page.orderSummary') || 'Order Summary'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    <span suppressHydrationWarning>
                      {t('landing.checkout.page.plan') || 'Plan:'}
                    </span>
                  </span>
                  <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{tierName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    <span suppressHydrationWarning>
                      {t('landing.checkout.page.amount') || 'Amount:'}
                    </span>
                  </span>
                  <span style={{ color: '#ffffff', fontWeight: 'bold' }}>
                    ${tierPrice.toLocaleString()}
                  </span>
                </div>
                <div
                  className="flex justify-between items-center pt-4 border-t"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
                >
                  <span style={{ color: '#ffffff', fontWeight: 'bold' }}>
                    <span suppressHydrationWarning>
                      {t('landing.checkout.page.total') || 'Total:'}
                    </span>
                  </span>
                  <span style={{ color: '#ff4538', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    ${tierPrice.toLocaleString()}
                  </span>
                </div>
                <div
                  className="flex items-start gap-2 mt-4 p-3 rounded-lg"
                  style={{ backgroundColor: 'rgba(255, 69, 56, 0.1)' }}
                >
                  <CheckCircle2
                    className="h-5 w-5 mt-0.5 flex-shrink-0"
                    style={{ color: '#ff4538' }}
                  />
                  <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    <span suppressHydrationWarning>
                      {t('landing.checkout.page.oneTimePayment') ||
                        "This is a one-time payment. You'll have full access to the dashboard after payment."}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Form */}
            <Card
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <CardHeader>
                <CardTitle style={{ color: '#ffffff' }}>
                  <span suppressHydrationWarning>
                    {t('landing.checkout.page.paymentDetails') || 'Payment Details'}
                  </span>
                </CardTitle>
                <CardDescription style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  <span suppressHydrationWarning>
                    {t('landing.checkout.page.securePayment') || 'Secure payment powered by Stripe'}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'night',
                      variables: {
                        colorPrimary: '#ff4538',
                        colorBackground: '#091a24',
                        colorText: '#ffffff',
                        colorDanger: '#ff4538',
                        fontFamily: 'system-ui, sans-serif',
                        borderRadius: '8px',
                      },
                    },
                  }}
                >
                  <CheckoutForm tier={tier} clientSecret={clientSecret} amount={tierPrice} />
                </Elements>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: '#091a24' }}
        >
          <Loader2 className="h-12 w-12 animate-spin" style={{ color: '#ff4538' }} />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
