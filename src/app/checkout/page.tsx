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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, CheckCircle2, Check, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/utils/axios';
import { isValidTier, getTierPrice, getTierName, SubscriptionTier } from '@/lib/utils/payment';
import { logger } from '@/lib/utils/logger';
import { sanitizeMessage } from '@/lib/utils/sanitize';
import { retryWithCircuitBreaker } from '@/lib/utils/retry-with-circuit-breaker';
import { toast } from 'sonner';
import Link from 'next/link';

// Initialize Stripe
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

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

      logger.info('[CheckoutForm] Confirming payment with Stripe', {
        clientSecret: clientSecret.substring(0, 20) + '...',
      });

      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        logger.error('[CheckoutForm] Payment confirmation error', {
          error: confirmError.message,
          code: confirmError.code,
          type: confirmError.type,
        });
        setError(
          confirmError.message || t('landing.checkout.page.paymentFailed') || 'Payment failed'
        );
        setIsProcessing(false);
      } else {
        // Payment succeeded - check if we need to redirect manually
        // If Stripe didn't redirect (redirect: 'if_required'), we need to redirect to success page
        logger.info('[CheckoutForm] Payment confirmed successfully, redirecting to success page');

        // Extract payment intent ID from clientSecret (format: pi_xxxxx_secret_yyyyy)
        const paymentIntentId = clientSecret.split('_secret_')[0];

        logger.info('[CheckoutForm] Extracted payment intent ID', {
          paymentIntentId: paymentIntentId.substring(0, 20) + '...',
        });

        // Always redirect to success page to show verification and proper flow
        // Pass payment intent ID as query parameter for immediate verification
        // Don't show toast here - let success page handle the messaging
        router.push(`/checkout/success?payment_intent=${paymentIntentId}`);
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
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="py-2">
        <PaymentElement />
      </div>
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
        className="w-full text-white py-6 text-lg font-semibold"
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
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
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
  const paymentRequired = searchParams.get('paymentRequired') === 'true';

  useEffect(() => {
    // Reset error and clientSecret when tier changes (but keep loading state)
    // This ensures clean state when user selects a plan
    if (tierParam) {
      setError(null);
      setClientSecret(null);
      setLoading(true);
    }

    // Redirect to login if not authenticated
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=/checkout?tier=${tierParam}`);
      return;
    }

    // Wait for auth to be ready
    if (authLoading || !isAuthenticated) {
      return;
    }

    // If no tier selected, show plan selection (don't set error, don't show loading)
    if (!tierParam || !isValidTier(tierParam)) {
      setLoading(false);
      setError(null); // Clear any previous errors
      return; // This will show the plan selection UI
    }

    // PERFORMANCE: Skip redundant payment status check - checkout API already validates hasPaid
    // This eliminates an extra API call and improves performance
    const createPaymentIntent = async () => {
      // Create payment intent with retry, exponential backoff, and circuit breaker
      try {
        // Use retry with circuit breaker for resilient payment initialization
        const response = await retryWithCircuitBreaker(
          async () => {
            // PERFORMANCE: Reduced client-side timeout to 25 seconds (Stripe has 15s, API has 30s)
            // This provides faster feedback to users
            // Create a fresh timeout promise for each retry attempt
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => {
                reject(new Error('Request timeout - payment initialization took too long'));
              }, 25000);
            });

            const result = await Promise.race([
              apiClient.post('/api/payments/checkout', {
                tier: tierParam,
              }),
              timeoutPromise,
            ]);
            return result as any;
          },
          {
            operationName: 'payment-initialization',
            maxRetries: 2, // Reduced from 3 to 2 for faster failure (Stripe has its own retries)
            initialDelayMs: 500, // Reduced from 1000ms for faster retry
            maxDelayMs: 5000, // Reduced from 10000ms for faster recovery
            backoffMultiplier: 2, // Exponential: 0.5s, 1s
            failureThreshold: 5, // Open circuit after 5 failures
            resetTimeoutMs: 30000, // Reduced from 60s to 30s for faster recovery
            halfOpenRetries: 2, // Need 2 successes to close circuit
            retryableStatusCodes: [408, 429, 500, 502, 503, 504],
            retryableErrors: [
              'timeout',
              'network',
              'econnrefused',
              'econnreset',
              'etimedout',
              'request aborted',
              'StripeConnectionError', // Add Stripe-specific errors
            ],
          }
        );

        const { clientSecret: secret, amount } = response.data.data;
        setClientSecret(secret);
        setLoading(false);
      } catch (err: any) {
        // Always stop loading on error
        setLoading(false);

        // Detect different error types for user-friendly messages
        const isTimeoutError =
          err.message?.includes('timeout') ||
          err.message?.includes('Request timeout') ||
          err.code === 'ECONNABORTED' ||
          err.response?.status === 504 ||
          err.response?.status === 408;

        const isCircuitBreakerOpen =
          err.message?.includes('Circuit breaker') ||
          err.message?.includes('Service is temporarily unavailable');

        const isNetworkError =
          err.message?.includes('network') ||
          err.code === 'ECONNREFUSED' ||
          err.code === 'ETIMEDOUT' ||
          err.response?.status === 502 ||
          err.response?.status === 503;

        let errorMessage: string;
        if (isCircuitBreakerOpen) {
          errorMessage =
            t('landing.checkout.page.serviceUnavailable') ||
            'Payment service is temporarily unavailable due to repeated failures. Please try again in a few moments.';
        } else if (isTimeoutError) {
          errorMessage =
            t('landing.checkout.page.timeoutError') ||
            'Payment initialization timed out. Please try again or contact support if the problem persists.';
        } else if (isNetworkError) {
          errorMessage =
            t('landing.checkout.page.networkError') ||
            'Network error occurred. Please check your connection and try again.';
        } else {
          // Extract error message from response or use default
          errorMessage =
            err.response?.data?.error ||
            err.response?.data?.message ||
            err.message ||
            t('landing.checkout.page.paymentInitFailed') ||
            'Failed to initialize payment. Please try again.';
        }

        setError(errorMessage);
        logger.error('Failed to create payment intent in checkout', err, {
          tier: tierParam,
          isTimeout: isTimeoutError,
          isCircuitBreakerOpen,
          isNetworkError,
        });
      }
    };

    createPaymentIntent();
  }, [isAuthenticated, authLoading, tierParam, router]);

  // Check if Stripe is configured
  // Note: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be set in environment variables
  const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!stripeKey || !stripePromise) {
    // Log warning in development to help debug
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[Checkout] Stripe is not configured. Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in your .env.local file.'
      );
    }

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
              {t('landing.checkout.page.stripeNotConfigured') ||
                'Stripe is not configured. Please contact support.'}
            </p>
            {process.env.NODE_ENV === 'development' && (
              <p className="text-sm mb-4" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                Developer note: Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in your .env.local file
              </p>
            )}
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

  // If no tier or invalid tier, show tier selection
  if (!tierParam || !isValidTier(tierParam)) {
    const tiers = [
      {
        name: t('landing.pricing.basic.name') || 'Basic',
        tagline: t('landing.pricing.basic.tagline') || 'Essential immigration support',
        price: 500,
        tier: 'basic' as SubscriptionTier,
        features: [
          t('landing.pricing.basic.feature1') || 'Document review & guidance',
          t('landing.pricing.basic.feature2') || 'Application form assistance',
          t('landing.pricing.basic.feature3') || 'Email support',
        ],
      },
      {
        name: t('landing.pricing.standard.name') || 'Standard',
        tagline: t('landing.pricing.standard.tagline') || 'Most popular choice',
        price: 1500,
        tier: 'standard' as SubscriptionTier,
        features: [
          t('landing.pricing.standard.feature1') || 'Full application support',
          t('landing.pricing.standard.feature2') || 'Priority processing',
          t('landing.pricing.standard.feature3') || '24/7 phone & email support',
          t('landing.pricing.standard.feature4') || 'Case tracking dashboard',
        ],
        highlight: true,
      },
      {
        name: t('landing.pricing.premium.name') || 'Premium',
        tagline: t('landing.pricing.premium.tagline') || 'Complete immigration solution',
        price: 2000,
        tier: 'premium' as SubscriptionTier,
        features: [
          t('landing.pricing.premium.feature1') || 'Dedicated immigration consultant',
          t('landing.pricing.premium.feature2') || 'Express processing',
          t('landing.pricing.premium.feature3') || 'Video consultations',
          t('landing.pricing.premium.feature4') || 'Priority support & updates',
        ],
      },
    ];

    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#091a24' }}>
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-7xl">
            {/* Payment Required Alert */}
            {paymentRequired && (
              <Alert
                className="mb-8 max-w-4xl mx-auto"
                style={{
                  backgroundColor: 'rgba(255, 69, 56, 0.1)',
                  borderColor: '#ff4538',
                  borderWidth: '1px',
                }}
              >
                <AlertCircle className="h-5 w-5" style={{ color: '#ff4538' }} />
                <AlertTitle className="text-lg font-semibold mb-2" style={{ color: '#ffffff' }}>
                  <span suppressHydrationWarning>
                    {t('landing.checkout.page.paymentRequiredTitle') ||
                      'Payment Required to Access Dashboard'}
                  </span>
                </AlertTitle>
                <AlertDescription
                  className="text-base leading-relaxed"
                  style={{ color: 'rgba(255, 255, 255, 0.9)' }}
                >
                  <span suppressHydrationWarning>
                    {t('landing.checkout.page.paymentRequiredMessage') ||
                      'To access your dashboard and start using our services, please select and complete payment for a subscription plan below. Once your payment is confirmed, you will have full access to all dashboard features.'}
                  </span>
                </AlertDescription>
              </Alert>
            )}
            <div className="text-center mb-12 md:mb-16">
              <h1
                className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4"
                style={{ color: '#ffffff' }}
              >
                <span suppressHydrationWarning>
                  {t('landing.checkout.page.selectPlan') || 'Select Your Plan'}
                </span>
              </h1>
              <p
                className="text-lg md:text-xl max-w-3xl mx-auto"
                style={{ color: 'rgba(255, 255, 255, 0.7)' }}
              >
                <span suppressHydrationWarning>
                  {t('landing.checkout.page.selectPlanDescription') ||
                    'Choose the subscription plan that best fits your needs'}
                </span>
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              {tiers.map((tierData, index) => {
                const isHighlight = tierData.highlight || false;
                return (
                  <Card
                    key={index}
                    className={`relative overflow-hidden border-2 transition-all duration-200 hover:shadow-lg ${
                      isHighlight ? 'shadow-lg scale-105' : ''
                    }`}
                    style={{
                      backgroundColor: '#091a24',
                      borderColor: isHighlight ? '#ff4538' : 'rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    {isHighlight && (
                      <div
                        className="absolute top-0 left-0 right-0 h-1"
                        style={{ backgroundColor: '#ff4538' }}
                      />
                    )}
                    <CardHeader>
                      <CardTitle className="text-2xl mb-2" style={{ color: '#ffffff' }}>
                        {tierData.name}
                      </CardTitle>
                      <CardDescription
                        className="text-base"
                        style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                      >
                        {tierData.tagline}
                      </CardDescription>
                      <div className="mt-4">
                        <span className="text-4xl font-bold" style={{ color: '#ffffff' }}>
                          ${tierData.price.toLocaleString()}
                        </span>
                        <span
                          className="text-sm ml-2"
                          style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                        >
                          <span suppressHydrationWarning>
                            {t('landing.pricing.oneTime') || 'one-time'}
                          </span>
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-3">
                        {tierData.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-start gap-2">
                            <Check
                              className="h-5 w-5 mt-0.5 flex-shrink-0"
                              style={{ color: '#ff4538' }}
                            />
                            <span className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        className="w-full mt-6 text-white"
                        style={{
                          backgroundColor: isHighlight ? '#ff4538' : 'transparent',
                          borderColor: '#ff4538',
                          borderWidth: isHighlight ? '0' : '1px',
                          color: isHighlight ? '#ffffff' : '#ff4538',
                        }}
                        onMouseEnter={(e) => {
                          if (isHighlight) {
                            e.currentTarget.style.backgroundColor = '#ff5c50';
                          } else {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 69, 56, 0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (isHighlight) {
                            e.currentTarget.style.backgroundColor = '#ff4538';
                          } else {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                        onClick={() => {
                          router.push(`/checkout?tier=${tierData.tier}`);
                        }}
                      >
                        <span suppressHydrationWarning>
                          {t('landing.pricing.getStarted') || 'Get Started'}
                        </span>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <div className="text-center mt-12">
              <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                <span suppressHydrationWarning>
                  {t('landing.pricing.footer') || 'All plans include free consultation'}
                </span>
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6 mt-4 opacity-60">
                <div className="text-sm font-semibold" style={{ color: '#ffffff' }}>
                  {t('landing.pricing.partner1') || 'Student Visas'}
                </div>
                <div className="text-sm font-semibold" style={{ color: '#ffffff' }}>
                  {t('landing.pricing.partner2') || 'Work Permits'}
                </div>
                <div className="text-sm font-semibold" style={{ color: '#ffffff' }}>
                  {t('landing.pricing.partner3') || 'Family Sponsorship'}
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const tier = tierParam as SubscriptionTier;
  const tierName = getTierName(tier);
  const tierPrice = getTierPrice(tier);

  // Show error state if there's an error (don't show loading spinner)
  if (error) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#091a24' }}>
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <Card
            className="max-w-md w-full"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
            }}
          >
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: '#ff4538' }} />
              <h2 className="text-xl font-semibold mb-4" style={{ color: '#ffffff' }}>
                <span suppressHydrationWarning>
                  {t('landing.checkout.page.paymentInitErrorTitle') ||
                    'Payment Initialization Failed'}
                </span>
              </h2>
              <p className="text-base mb-6" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                {error}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={async () => {
                    setError(null);
                    setLoading(true);
                    // Retry with circuit breaker and exponential backoff
                    try {
                      const response = await retryWithCircuitBreaker(
                        async () => {
                      // Create a fresh timeout promise for each retry attempt
                          const timeoutPromise = new Promise((_, reject) => {
                            setTimeout(() => {
                              reject(
                                new Error('Request timeout - payment initialization took too long')
                              );
                            }, 25000);
                          });

                          const result = await Promise.race([
                            apiClient.post('/api/payments/checkout', {
                              tier: tierParam,
                            }),
                            timeoutPromise,
                          ]);
                          return result as any;
                        },
                        {
                          operationName: 'payment-initialization',
                          maxRetries: 2,
                          initialDelayMs: 500,
                          maxDelayMs: 5000,
                          backoffMultiplier: 2,
                          failureThreshold: 5,
                          resetTimeoutMs: 30000,
                          halfOpenRetries: 2,
                          retryableStatusCodes: [408, 429, 500, 502, 503, 504],
                          retryableErrors: [
                            'timeout',
                            'network',
                            'econnrefused',
                            'econnreset',
                            'etimedout',
                            'request aborted',
                            'StripeConnectionError',
                          ],
                        }
                      );

                      const { clientSecret: secret } = response.data.data;
                      setClientSecret(secret);
                      setLoading(false);
                    } catch (err: any) {
                      setLoading(false);
                      const isTimeoutError =
                        err.message?.includes('timeout') ||
                        err.message?.includes('Request timeout') ||
                        err.code === 'ECONNABORTED' ||
                        err.response?.status === 504 ||
                        err.response?.status === 408;
                      const isCircuitBreakerOpen =
                        err.message?.includes('Circuit breaker') ||
                        err.message?.includes('Service is temporarily unavailable');
                      const isNetworkError =
                        err.message?.includes('network') ||
                        err.code === 'ECONNREFUSED' ||
                        err.code === 'ETIMEDOUT' ||
                        err.response?.status === 502 ||
                        err.response?.status === 503;

                      let errorMsg: string;
                      if (isCircuitBreakerOpen) {
                        errorMsg =
                          t('landing.checkout.page.serviceUnavailable') ||
                          'Payment service is temporarily unavailable due to repeated failures. Please try again in a few moments.';
                      } else if (isTimeoutError) {
                        errorMsg =
                          t('landing.checkout.page.timeoutError') ||
                          'Payment initialization timed out. Please try again or contact support if the problem persists.';
                      } else if (isNetworkError) {
                        errorMsg =
                          t('landing.checkout.page.networkError') ||
                          'Network error occurred. Please check your connection and try again.';
                      } else {
                        errorMsg =
                          err.response?.data?.error ||
                          err.response?.data?.message ||
                          err.message ||
                          t('landing.checkout.page.paymentInitFailed') ||
                          'Failed to initialize payment. Please try again.';
                      }
                      setError(errorMsg);
                    }
                  }}
                  style={{ backgroundColor: '#ff4538' }}
                  className="text-white"
                >
                  <span suppressHydrationWarning>{t('common.tryAgain') || 'Try Again'}</span>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  style={{
                    borderColor: '#ff4538',
                    color: '#ff4538',
                    backgroundColor: 'transparent',
                  }}
                >
                  <Link href="/checkout">
                    <span suppressHydrationWarning>
                      {t('landing.checkout.page.selectPlan') || 'Select Plan'}
                    </span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Show loading state only if no error and no clientSecret yet, and we have a valid tier
  // This means we're actively initializing payment
  if (!clientSecret && loading && tierParam && isValidTier(tierParam) && !error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#091a24' }}
      >
        <div className="text-center max-w-md px-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" style={{ color: '#ff4538' }} />
          <p className="text-lg font-medium mb-2" style={{ color: '#ffffff' }}>
            <span suppressHydrationWarning>
              {t('landing.checkout.page.initializing') || 'Initializing payment...'}
            </span>
          </p>
          <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            <span suppressHydrationWarning>
              {t('landing.checkout.page.initializingDescription') ||
                'Setting up secure payment. This usually takes just a few seconds.'}
            </span>
          </p>
        </div>
      </div>
    );
  }

  // Remove this fallback - it was causing error card to show prematurely
  // Error card should only show when there's an explicit error state (handled above)
  // If we have a valid tier but no clientSecret and not loading, show loading instead
  // to give initialization a chance
  if (!clientSecret && !loading && tierParam && isValidTier(tierParam) && !error) {
    // Show loading to allow initialization to complete
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
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="w-full max-w-6xl">
          {/* Payment Required Alert */}
          {paymentRequired && (
            <Alert
              className="mb-8"
              style={{
                backgroundColor: 'rgba(255, 69, 56, 0.1)',
                borderColor: '#ff4538',
                borderWidth: '1px',
              }}
            >
              <AlertCircle className="h-5 w-5" style={{ color: '#ff4538' }} />
              <AlertTitle className="text-lg font-semibold mb-2" style={{ color: '#ffffff' }}>
                <span suppressHydrationWarning>
                  {t('landing.checkout.page.paymentRequiredTitle') ||
                    'Payment Required to Access Dashboard'}
                </span>
              </AlertTitle>
              <AlertDescription
                className="text-base leading-relaxed"
                style={{ color: 'rgba(255, 255, 255, 0.9)' }}
              >
                <span suppressHydrationWarning>
                  {t('landing.checkout.page.paymentRequiredMessage') ||
                    'To access your dashboard and start using our services, please complete payment for your selected plan below. Once your payment is confirmed, you will have full access to all dashboard features.'}
                </span>
              </AlertDescription>
            </Alert>
          )}
          <Button
            variant="ghost"
            className="mb-8 text-base"
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
              <ArrowLeft className="mr-2 h-5 w-5" />
              <span suppressHydrationWarning>
                {t('landing.checkout.page.backToHome') || 'Back to Home'}
              </span>
            </Link>
          </Button>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Order Summary */}
            <Card
              className="h-fit"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl" style={{ color: '#ffffff' }}>
                  <span suppressHydrationWarning>
                    {t('landing.checkout.page.orderSummary') || 'Order Summary'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex justify-between items-center py-2">
                  <span className="text-base" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    <span suppressHydrationWarning>
                      {t('landing.checkout.page.plan') || 'Plan:'}
                    </span>
                  </span>
                  <span className="text-lg font-semibold" style={{ color: '#ffffff' }}>
                    {tierName}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-base" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    <span suppressHydrationWarning>
                      {t('landing.checkout.page.amount') || 'Amount:'}
                    </span>
                  </span>
                  <span className="text-lg font-semibold" style={{ color: '#ffffff' }}>
                    ${tierPrice.toLocaleString()}
                  </span>
                </div>
                <div
                  className="flex justify-between items-center pt-6 pb-2 border-t"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
                >
                  <span className="text-lg font-semibold" style={{ color: '#ffffff' }}>
                    <span suppressHydrationWarning>
                      {t('landing.checkout.page.total') || 'Total:'}
                    </span>
                  </span>
                  <span style={{ color: '#ff4538', fontSize: '2rem', fontWeight: 'bold' }}>
                    ${tierPrice.toLocaleString()}
                  </span>
                </div>
                <div
                  className="flex items-start gap-3 mt-6 p-4 rounded-lg"
                  style={{ backgroundColor: 'rgba(255, 69, 56, 0.1)' }}
                >
                  <CheckCircle2
                    className="h-6 w-6 mt-0.5 flex-shrink-0"
                    style={{ color: '#ff4538' }}
                  />
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'rgba(255, 255, 255, 0.8)' }}
                  >
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
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl" style={{ color: '#ffffff' }}>
                  <span suppressHydrationWarning>
                    {t('landing.checkout.page.paymentDetails') || 'Payment Details'}
                  </span>
                </CardTitle>
                <CardDescription
                  className="text-base mt-2"
                  style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                >
                  <span suppressHydrationWarning>
                    {t('landing.checkout.page.securePayment') || 'Secure payment powered by Stripe'}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-8">
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret: clientSecret ?? undefined,
                    appearance: {
                      theme: 'night',
                      variables: {
                        colorPrimary: '#ff4538',
                        colorBackground: '#091a24',
                        colorText: '#ffffff',
                        colorDanger: '#ff4538',
                        fontFamily: 'system-ui, sans-serif',
                        borderRadius: '12px',
                        spacingUnit: '8px',
                      },
                    },
                  }}
                >
                  <CheckoutForm tier={tier} clientSecret={clientSecret!} amount={tierPrice} />
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
