/**
 * API Route: Get User Payment Status
 * GET /api/payments/status
 */

import { NextRequest } from 'next/server';
import { authenticateToken, AuthenticatedRequest } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { asyncHandler } from '@/lib/utils/error-handler';
import { ApiError, HttpStatus, ErrorMessages } from '@/lib/utils/error-handler';
import { successResponse } from '@/lib/utils/api-response';
import { withCorsMiddleware } from '@/lib/middleware/cors';
import { withRateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit';
import { shouldBypassPayment } from '@/lib/utils/payment';

// GET /api/payments/status - Get user payment status
const getHandler = asyncHandler(async (request: NextRequest) => {
  const req = request as AuthenticatedRequest;

  if (!req.user) {
    throw new ApiError(ErrorMessages[401], HttpStatus.UNAUTHORIZED);
  }

  // Check if user should bypass payment
  if (shouldBypassPayment(req.user.role)) {
    return successResponse(
      {
        hasPaid: true,
        subscriptionTier: null,
        paymentDate: null,
        bypassed: true,
      },
      'Payment status retrieved'
    );
  }

  // Get user payment status
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      hasPaid: true,
      subscriptionTier: true,
      paymentDate: true,
      subscriptionExpiresAt: true,
    },
  });

  if (!user) {
    throw new ApiError('User not found', HttpStatus.NOT_FOUND);
  }

  return successResponse(
    {
      hasPaid: user.hasPaid,
      subscriptionTier: user.subscriptionTier,
      paymentDate: user.paymentDate?.toISOString() || null,
      subscriptionExpiresAt: user.subscriptionExpiresAt?.toISOString() || null,
      bypassed: false,
    },
    'Payment status retrieved'
  );
});

// Apply middleware and authentication
export const GET = withCorsMiddleware(
  withRateLimit(authenticateToken(getHandler), RateLimitPresets.STANDARD)
);
