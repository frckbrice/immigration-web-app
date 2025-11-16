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

  // Check if user already has a payment
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { hasPaid: true, subscriptionTier: true, role: true },
  });

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

  const tierPrice = getTierPrice(tier as SubscriptionTier);
  const tierName = getTierName(tier as SubscriptionTier);

  try {
    // Create Stripe payment intent
    const stripeIntent = await createPaymentIntent({
      amount: tierPrice,
      currency: 'usd',
      description: `${tierName} Subscription - One-time payment`,
      metadata: {
        userId: req.user.userId,
        tier: tier,
        type: 'subscription',
      },
    });

    // Convert amount from Stripe (cents) to major units for storage
    const amountInMajorUnits = stripeIntent.amount / 100;

    // Save payment intent to database
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

    logger.info('Checkout payment intent created', {
      paymentId: payment.id,
      stripeIntentId: stripeIntent.id,
      userId: req.user.userId,
      tier: tier,
      amount: amountInMajorUnits,
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
    logger.error('Failed to create checkout payment intent', error, {
      userId: req.user.userId,
      tier: tier,
    });

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      error instanceof Error ? error.message : 'Failed to create payment intent',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

// Apply middleware and authentication
export const POST = withCorsMiddleware(
  withRateLimit(authenticateToken(postHandler), RateLimitPresets.STANDARD)
);
