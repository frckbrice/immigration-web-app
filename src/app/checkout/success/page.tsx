'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/utils/axios';
import { logger } from '@/lib/utils/logger';
import { toast } from 'sonner';
import { sanitizeMessage } from '@/lib/utils/sanitize';

type VerificationStatus = 'verifying' | 'verified' | 'delayed' | 'failed';

function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const paymentIntent = searchParams.get('payment_intent');
  const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret');
  const redirectStatus = searchParams.get('redirect_status');
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    logger.info('[CheckoutSuccess] Page loaded', {
      paymentIntent: paymentIntent || 'none',
      paymentIntentClientSecret: paymentIntentClientSecret ? 'present' : 'none',
      redirectStatus: redirectStatus || 'none',
      url: window.location.href,
    });

    // Check if payment failed based on URL parameters
    if (redirectStatus === 'failed' || paymentIntentClientSecret?.includes('_secret_')) {
      logger.warn('[CheckoutSuccess] Payment failure detected from URL parameters', {
        redirectStatus,
        hasClientSecret: !!paymentIntentClientSecret,
      });
      setVerificationStatus('failed');
      setErrorMessage(
        t('landing.checkout.success.paymentFailed') ||
          'Payment failed. Please try again or contact support if the problem persists.'
      );
      return;
    }

    // Verify payment status with exponential backoff
    const verifyPayment = async () => {
      const maxAttempts = 5;
      const delays = [500, 1000, 2000, 4000, 8000]; // Faster initial attempts: 0.5s, 1s, 2s, 4s, 8s

      logger.info('[CheckoutSuccess] Starting payment verification', {
        maxAttempts,
        delays,
        paymentIntent: paymentIntent || 'none',
      });

      // First, try to verify payment intent directly if we have it
      if (paymentIntent) {
        try {
          logger.info('[CheckoutSuccess] Verifying payment intent directly', {
            paymentIntent,
          });

          const verifyResponse = await apiClient.post('/api/payments/verify', {
            paymentIntentId: paymentIntent,
          });

          if (verifyResponse.data.success) {
            const verifyData = verifyResponse.data.data;

            logger.info('[CheckoutSuccess] Payment verification response', {
              stripeStatus: verifyData.stripeStatus,
              paymentStatus: verifyData.paymentStatus,
              hasPaid: verifyData.hasPaid,
            });

            if (verifyData.stripeStatus === 'succeeded' && verifyData.hasPaid) {
              logger.info('[CheckoutSuccess] Payment verified successfully via verify endpoint', {
                paymentIntent,
                attempts: 1,
              });

              setVerificationStatus('verified');

              // Show success toast
              toast.success(
                sanitizeMessage(
                  t('landing.checkout.page.paymentSuccessful') ||
                    'Payment successful! Redirecting to dashboard...'
                )
              );

              // Redirect to dashboard after verification
              setTimeout(() => {
                logger.info('[CheckoutSuccess] Redirecting to dashboard');
                router.push('/dashboard');
              }, 1500);
              return;
            } else if (
              verifyData.stripeStatus === 'failed' ||
              verifyData.paymentStatus === 'FAILED'
            ) {
              logger.warn('[CheckoutSuccess] Payment failed according to verify endpoint', {
                paymentIntent,
                stripeStatus: verifyData.stripeStatus,
                paymentStatus: verifyData.paymentStatus,
              });
              setVerificationStatus('failed');
              setErrorMessage(
                t('landing.checkout.success.paymentFailed') ||
                  'Payment failed. Please try again or contact support if the problem persists.'
              );
              return;
            }
          }
        } catch (verifyError: any) {
          logger.error('[CheckoutSuccess] Payment verify endpoint error', {
            error: verifyError.message,
            paymentIntent,
            stack: verifyError.stack,
          });
          // Continue with fallback verification
        }
      }

      // Fallback: Check user payment status with exponential backoff
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          logger.info('[CheckoutSuccess] Verification attempt (fallback)', {
            attempt: attempt + 1,
            maxAttempts,
          });

          const response = await apiClient.get('/api/payments/status');

          logger.info('[CheckoutSuccess] Payment status response', {
            success: response.data.success,
            hasPaid: response.data.data?.hasPaid,
            bypassed: response.data.data?.bypassed,
            attempt: attempt + 1,
          });

          if (response.data.success) {
            const paymentData = response.data.data;

            // Check if payment failed (user exists but hasn't paid and isn't bypassed)
            // This could happen if webhook processed a failure
            if (!paymentData.hasPaid && !paymentData.bypassed && attempt >= 2) {
              // After a few attempts, check if this is actually a failure
              // We'll check the payment record directly if we have paymentIntent
              if (paymentIntent) {
                try {
                  const paymentResponse = await apiClient.get(
                    `/api/payments/intents/${paymentIntent}`
                  );
                  if (paymentResponse.data.success) {
                    const payment = paymentResponse.data.data;
                    if (payment.status === 'failed' || payment.status === 'canceled') {
                      logger.warn('[CheckoutSuccess] Payment failed according to payment record', {
                        paymentId: payment.id,
                        status: payment.status,
                      });
                      setVerificationStatus('failed');
                      setErrorMessage(
                        t('landing.checkout.success.paymentFailed') ||
                          'Payment failed. Please try again or contact support if the problem persists.'
                      );
                      return;
                    }
                  }
                } catch (paymentError) {
                  logger.error('[CheckoutSuccess] Failed to check payment record', paymentError);
                  // Continue with verification attempts
                }
              }
            }

            if (paymentData.hasPaid || paymentData.bypassed) {
              logger.info('[CheckoutSuccess] Payment verified successfully', {
                hasPaid: paymentData.hasPaid,
                bypassed: paymentData.bypassed,
                attempts: attempt + 1,
              });

              setVerificationStatus('verified');

              // Show success toast
              toast.success(
                sanitizeMessage(
                  t('landing.checkout.page.paymentSuccessful') ||
                    'Payment successful! Redirecting to dashboard...'
                )
              );

              // Redirect to dashboard after verification
              setTimeout(() => {
                logger.info('[CheckoutSuccess] Redirecting to dashboard');
                router.push('/dashboard');
              }, 1500);
              return;
            }
          }
        } catch (error: any) {
          logger.error('[CheckoutSuccess] Payment verification error', {
            error: error.message,
            attempt: attempt + 1,
            stack: error.stack,
          });
        }

        // Wait before next attempt (except on last attempt)
        if (attempt < maxAttempts - 1) {
          logger.info('[CheckoutSuccess] Waiting before next attempt', {
            delay: delays[attempt],
            nextAttempt: attempt + 2,
          });
          await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
        }
      }

      // If verification failed after all attempts, still redirect but show delayed message
      logger.warn('[CheckoutSuccess] Payment verification delayed after all attempts', {
        maxAttempts,
      });

      setVerificationStatus('delayed');

      // Show delayed toast
      toast.info(
        sanitizeMessage(
          t('landing.checkout.success.verificationDelayed') ||
            'Payment verification delayed. You will be redirected shortly...'
        )
      );

      setTimeout(() => {
        logger.info('[CheckoutSuccess] Redirecting to dashboard (delayed verification)');
        router.push('/dashboard');
      }, 3000);
    };

    verifyPayment();
  }, [router, paymentIntent, t]);

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
              {verificationStatus === 'failed' ? (
                <>
                  <div
                    className="h-16 w-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(255, 69, 56, 0.1)' }}
                  >
                    <svg
                      className="h-8 w-8"
                      style={{ color: '#ff4538' }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold mb-2" style={{ color: '#ff4538' }}>
                    <span suppressHydrationWarning>
                      {t('landing.checkout.success.paymentFailedTitle') || 'Payment Failed'}
                    </span>
                  </h1>
                  <p className="text-sm mb-4" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    <span suppressHydrationWarning>
                      {errorMessage ||
                        t('landing.checkout.success.paymentFailed') ||
                        'Payment failed. Please try again or contact support if the problem persists.'}
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-16 w-16 mx-auto mb-4" style={{ color: '#ff4538' }} />
                  <h1 className="text-2xl font-bold mb-2" style={{ color: '#ffffff' }}>
                    <span suppressHydrationWarning>
                      {t('landing.checkout.success.title') || 'Payment Successful!'}
                    </span>
                  </h1>
                  <p className="text-sm mb-4" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    <span suppressHydrationWarning>
                      {t('landing.checkout.success.message') ||
                        'Your subscription has been activated. Redirecting to dashboard...'}
                    </span>
                  </p>
                  {verificationStatus === 'verifying' && (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#ff4538' }} />
                      <span className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        <span suppressHydrationWarning>
                          {t('landing.checkout.success.verifying') || 'Verifying payment...'}
                        </span>
                      </span>
                    </div>
                  )}
                  {verificationStatus === 'verified' && (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-4 w-4" style={{ color: '#ff4538' }} />
                      <span className="text-sm" style={{ color: '#ff4538' }}>
                        <span suppressHydrationWarning>
                          {t('landing.checkout.success.verified') ||
                            'Payment verified! Redirecting...'}
                        </span>
                      </span>
                    </div>
                  )}
                  {verificationStatus === 'delayed' && (
                    <p
                      className="text-sm text-center"
                      style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                    >
                      <span suppressHydrationWarning>
                        {t('landing.checkout.success.verificationDelayed') ||
                          'Payment verification delayed. You will be redirected shortly...'}
                      </span>
                    </p>
                  )}
                </>
              )}
            </div>
            {verificationStatus === 'failed' ? (
              <div className="space-y-4">
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
                  <Link href="/checkout">
                    <span suppressHydrationWarning>
                      {t('landing.checkout.success.tryAgain') || 'Try Again'}
                    </span>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full"
                  style={{
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'rgba(255, 255, 255, 0.8)',
                    backgroundColor: 'transparent',
                  }}
                >
                  <Link href="/dashboard">
                    <span suppressHydrationWarning>
                      {t('landing.checkout.success.goToDashboard') || 'Go to Dashboard'}
                    </span>
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                {verificationStatus !== 'verifying' && (
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#ff4538' }} />
                    <span className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      <span suppressHydrationWarning>
                        {t('landing.checkout.success.redirecting') || 'Redirecting...'}
                      </span>
                    </span>
                  </div>
                )}
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
                  <Link href="/dashboard">
                    <span suppressHydrationWarning>
                      {t('landing.checkout.success.goToDashboard') || 'Go to Dashboard'}
                    </span>
                  </Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: '#091a24' }}
        >
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#ff4538' }} />
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
