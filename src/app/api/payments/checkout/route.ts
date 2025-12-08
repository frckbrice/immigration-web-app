/**
 * API Route: Create Payment Intent for Checkout
 * POST /api/payments/checkout
 */

import { NextRequest } from 'next/server';
import { authenticateToken, AuthenticatedRequest } from '@/lib/auth/middleware';
import { createPaymentIntent } from '@/lib/services/stripe';
import { prisma } from '@/lib/db/prisma';
import { mapStripeStatusToPaymentStatus } from '@/lib/services/stripe';
import { isValidTier, getTierPrice, getTierName, SubscriptionTier } from '@/lib/utils/payment';
import { asyncHandler } from '@/lib/utils/error-handler';
import { ApiError, HttpStatus, ErrorMessages } from '@/lib/utils/error-handler';
import { successResponse } from '@/lib/utils/api-response';
import { withCorsMiddleware } from '@/lib/middleware/cors';
import { withRateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/utils/logger';

// POST /api/payments/checkout - Create payment intent for subscription tier
const postHandler = asyncHandler(async (request: NextRequest) => {
  const req = request as AuthenticatedRequest;

  if (!req.user) {
    throw new ApiError(ErrorMessages[401], HttpStatus.UNAUTHORIZED);
  }

  const body = await request.json();
  const { tier } = body;

  // Validation
  if (!tier || typeof tier !== 'string') {
    throw new ApiError('Tier is required', HttpStatus.BAD_REQUEST);
  }

  if (!isValidTier(tier)) {
    throw new ApiError('Invalid tier. Must be basic, standard, or premium', HttpStatus.BAD_REQUEST);
  }

  // PERFORMANCE: Optimize database queries - check user and existing payment in parallel
  const [user, existingPayment] = await Promise.all([
    prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { hasPaid: true, subscriptionTier: true, role: true },
    }),
    // Check for existing pending/completed payment intents for this user and tier (idempotency)
    prisma.payment.findFirst({
      where: {
        userId: req.user.userId,
        status: {
          in: ['PENDING', 'PROCESSING', 'COMPLETED'],
        },
        metadata: {
          path: ['tier'],
          equals: tier,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        status: true,
        clientSecret: true,
        amount: true,
        currency: true,
        stripeIntentId: true,
        createdAt: true,
      },
    }),
  ]);

  if (!user) {
    throw new ApiError('User not found', HttpStatus.NOT_FOUND);
  }

  // AGENT and ADMIN bypass payment requirement
  if (user.role === 'AGENT' || user.role === 'ADMIN') {
    throw new ApiError('This account type does not require payment', HttpStatus.BAD_REQUEST);
  }

  if (user.hasPaid) {
    throw new ApiError('User has already paid for a subscription', HttpStatus.BAD_REQUEST);
  }

  if (existingPayment) {
    // If payment is completed, user should have hasPaid set
    if (existingPayment.status === 'COMPLETED') {
      logger.warn('User already has completed payment for this tier', {
        userId: req.user.userId,
        tier,
        paymentId: existingPayment.id,
        stripeIntentId: existingPayment.stripeIntentId,
      });
      throw new ApiError('User has already paid for a subscription', HttpStatus.BAD_REQUEST);
    }

    // If payment is pending or processing, return existing payment intent
    logger.info('Returning existing payment intent', {
      userId: req.user.userId,
      tier,
      paymentId: existingPayment.id,
      stripeIntentId: existingPayment.stripeIntentId,
      status: existingPayment.status,
    });

    return successResponse(
      {
        clientSecret: existingPayment.clientSecret,
        paymentIntentId: existingPayment.id,
        amount: Number(existingPayment.amount),
        currency: existingPayment.currency,
        tier: tier,
      },
      'Existing payment intent found'
    );
  }

  const tierPrice = getTierPrice(tier as SubscriptionTier);
  const tierName = getTierName(tier as SubscriptionTier);

  try {
    const startTime = Date.now();
    logger.info('Creating Stripe payment intent', {
      userId: req.user.userId,
      tier: tier,
      tierPrice: tierPrice,
      tierName: tierName,
    });

    // Create Stripe payment intent with timeout protection
    const stripeIntent = await Promise.race([
      createPaymentIntent({
        amount: tierPrice,
        currency: 'usd',
        description: `${tierName} Subscription - One-time payment`,
        metadata: {
          userId: req.user.userId,
          tier: tier,
          type: 'subscription',
        },
      }),
      // Additional safety timeout (20 seconds) - Stripe client has 15s, this is backup
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Stripe API call exceeded maximum timeout'));
        }, 20000);
      }),
    ]);

    const stripeCallDuration = Date.now() - startTime;

    // Convert amount from Stripe (cents) to major units for storage
    const amountInMajorUnits = stripeIntent.amount / 100;

    logger.info('Stripe payment intent created', {
      stripeIntentId: stripeIntent.id,
      amount: amountInMajorUnits,
      currency: stripeIntent.currency,
      duration: `${stripeCallDuration}ms`,
    });

    // PERFORMANCE: Save payment intent to database (non-blocking for response, but we wait for it)
    const payment = await prisma.payment.create({
      data: {
        userId: req.user.userId,
        stripeIntentId: stripeIntent.id,
        amount: amountInMajorUnits,
        currency: stripeIntent.currency,
        description: stripeIntent.description || `${tierName} Subscription`,
        status: mapStripeStatusToPaymentStatus(stripeIntent.status),
        metadata: {
          tier: tier,
          type: 'subscription',
        },
        clientSecret: stripeIntent.client_secret || null,
      },
    });

    const totalDuration = Date.now() - startTime;
    logger.info('Checkout payment intent created successfully', {
      paymentId: payment.id,
      stripeIntentId: stripeIntent.id,
      userId: req.user.userId,
      tier: tier,
      amount: amountInMajorUnits,
      totalDuration: `${totalDuration}ms`,
      stripeCallDuration: `${stripeCallDuration}ms`,
    });

    return successResponse(
      {
        clientSecret: stripeIntent.client_secret,
        paymentIntentId: payment.id,
        amount: amountInMajorUnits,
        currency: stripeIntent.currency,
        tier: tier,
      },
      'Payment intent created successfully'
    );
  } catch (error) {
    // Enhanced error logging for diagnostics
    const errorDetails: any = {
      userId: req.user.userId,
      tier: tier,
      tierPrice,
      tierName,
    };

    // Add Stripe-specific error details if available
    const stripeError = error as any;
    if (stripeError.type || stripeError.code) {
      errorDetails.stripeErrorType = stripeError.type;
      errorDetails.stripeErrorCode = stripeError.code;
      errorDetails.stripeStatusCode = stripeError.statusCode;
      errorDetails.stripeRequestId = stripeError.requestId;
      errorDetails.stripeDeclineCode = stripeError.decline_code;
    }

    // Add network error details if available
    if (stripeError.code === 'ECONNABORTED' || stripeError.code === 'ETIMEDOUT') {
      errorDetails.networkError = true;
      errorDetails.errorCode = stripeError.code;
    }

    logger.error('Failed to create checkout payment intent', error, errorDetails);

    if (error instanceof ApiError) {
      throw error;
    }

    // Provide more specific error messages based on error type
    let errorMessage = 'Failed to create payment intent';
    if (stripeError.type === 'StripeInvalidRequestError') {
      errorMessage =
        stripeError.message || 'Invalid payment request. Please check your payment details.';
    } else if (stripeError.type === 'StripeAPIError') {
      errorMessage = 'Payment service temporarily unavailable. Please try again.';
    } else if (stripeError.code === 'ECONNABORTED' || stripeError.code === 'ETIMEDOUT') {
      errorMessage = 'Payment request timed out. Please try again.';
    } else if (stripeError.message) {
      errorMessage = stripeError.message;
    }

    throw new ApiError(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
  }
});

// Apply middleware and authentication
export const POST = withCorsMiddleware(
  withRateLimit(authenticateToken(postHandler), RateLimitPresets.STANDARD)
);
