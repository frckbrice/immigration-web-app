/**
 * API Route: Verify and Update Payment Status
 * POST /api/payments/verify
 * Verifies payment intent status from Stripe and updates user payment status immediately
 * This is used by the success page to verify payment without waiting for webhook
 */

import { NextRequest } from 'next/server';
import { authenticateToken, AuthenticatedRequest } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { getPaymentIntent } from '@/lib/services/stripe';
import { asyncHandler } from '@/lib/utils/error-handler';
import { ApiError, HttpStatus, ErrorMessages } from '@/lib/utils/error-handler';
import { successResponse } from '@/lib/utils/api-response';
import { withCorsMiddleware } from '@/lib/middleware/cors';
import { withRateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/utils/logger';

// POST /api/payments/verify - Verify payment intent and update user status
const postHandler = asyncHandler(async (request: NextRequest) => {
  const req = request as AuthenticatedRequest;

  if (!req.user) {
    throw new ApiError(ErrorMessages[401], HttpStatus.UNAUTHORIZED);
  }

  const body = await request.json();
  const { paymentIntentId } = body;

  if (!paymentIntentId || typeof paymentIntentId !== 'string') {
    throw new ApiError('Payment intent ID is required', HttpStatus.BAD_REQUEST);
  }

  logger.info('[PaymentVerify] Verifying payment intent', {
    paymentIntentId,
    userId: req.user.userId,
  });

  // Find payment in database by Stripe intent ID
  const payment = await prisma.payment.findUnique({
    where: { stripeIntentId: paymentIntentId },
    include: { user: true },
  });

  if (!payment) {
    logger.warn('[PaymentVerify] Payment not found', {
      paymentIntentId,
      userId: req.user.userId,
    });
    throw new ApiError('Payment intent not found', HttpStatus.NOT_FOUND);
  }

  // Check permissions - users can only verify their own payments
  if (payment.userId !== req.user.userId && req.user.role !== 'ADMIN') {
    throw new ApiError(ErrorMessages[403], HttpStatus.FORBIDDEN);
  }

  try {
    // Get latest status from Stripe
    const stripeIntent = await getPaymentIntent(paymentIntentId);

    logger.info('[PaymentVerify] Stripe payment intent status', {
      paymentIntentId,
      stripeStatus: stripeIntent.status,
      currentDbStatus: payment.status,
    });

    // Map Stripe status to our status
    const mappedStatus =
      stripeIntent.status === 'succeeded'
        ? 'COMPLETED'
        : stripeIntent.status === 'canceled'
          ? 'CANCELED'
          : stripeIntent.status === 'processing'
            ? 'PROCESSING'
            : stripeIntent.status === 'requires_payment_method' ||
                stripeIntent.status === 'requires_confirmation'
              ? 'PENDING'
              : 'FAILED';

    // Update payment status if it changed
    if (payment.status !== mappedStatus) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: mappedStatus },
      });

      logger.info('[PaymentVerify] Payment status updated', {
        paymentId: payment.id,
        oldStatus: payment.status,
        newStatus: mappedStatus,
      });
    }

    // If payment succeeded, update user payment status immediately
    if (stripeIntent.status === 'succeeded') {
      const tier = (payment.metadata as any)?.tier;

      if (tier && (tier === 'basic' || tier === 'standard' || tier === 'premium')) {
        const tierUpper = tier.toUpperCase();

        // Check if user already has payment status set (idempotency)
        if (!payment.user.hasPaid || payment.user.subscriptionTier !== tierUpper) {
          await prisma.user.update({
            where: { id: payment.userId },
            data: {
              hasPaid: true,
              subscriptionTier: tierUpper,
              paymentDate: new Date(),
              subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            },
          });

          logger.info('[PaymentVerify] User payment status updated', {
            userId: payment.userId,
            tier: tierUpper,
            paymentIntentId,
          });
        } else {
          logger.info('[PaymentVerify] User payment status already set (idempotency)', {
            userId: payment.userId,
            tier: tierUpper,
          });
        }
      } else {
        logger.warn('[PaymentVerify] Invalid or missing tier in payment metadata', {
          paymentIntentId,
          metadata: payment.metadata,
        });
      }
    }

    // Get updated user status
    const updatedUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        hasPaid: true,
        subscriptionTier: true,
        paymentDate: true,
        subscriptionExpiresAt: true,
      },
    });

    return successResponse(
      {
        paymentStatus: mappedStatus,
        stripeStatus: stripeIntent.status,
        hasPaid: updatedUser?.hasPaid || false,
        subscriptionTier: updatedUser?.subscriptionTier,
        paymentDate: updatedUser?.paymentDate?.toISOString() || null,
        subscriptionExpiresAt: updatedUser?.subscriptionExpiresAt?.toISOString() || null,
      },
      'Payment verified successfully'
    );
  } catch (error: any) {
    logger.error('[PaymentVerify] Failed to verify payment', {
      error: error.message,
      paymentIntentId,
      userId: req.user.userId,
      stack: error.stack,
    });

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      error instanceof Error ? error.message : 'Failed to verify payment',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

// Apply middleware and authentication
export const POST = withCorsMiddleware(
  withRateLimit(authenticateToken(postHandler), RateLimitPresets.STANDARD)
);
