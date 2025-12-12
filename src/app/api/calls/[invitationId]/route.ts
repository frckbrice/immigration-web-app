/**
 * Call Invitation Management API
 * Accept, reject, cancel, or end calls
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateToken, AuthenticatedRequest } from '@/lib/auth/middleware';
import { ERROR_MESSAGES } from '@/lib/constants';
import { ApiError, HttpStatus, asyncHandler } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';
import { withCorsMiddleware } from '@/lib/middleware/cors';
import { withRateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit';
import { prisma } from '@/lib/db/prisma';

interface RouteParams {
  params: Promise<{ invitationId: string }>;
}

const acceptHandler = asyncHandler(async (request: NextRequest, context: RouteParams) => {
  const req = request as AuthenticatedRequest;
  const { invitationId } = await context.params;

  if (!req.user) {
    throw new ApiError(ERROR_MESSAGES.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
  }

  // Get user's Firebase UID
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { firebaseId: true },
  });

  if (!user || !user.firebaseId) {
    throw new ApiError('User not found or not configured', HttpStatus.NOT_FOUND);
  }

  const { acceptCallInvitation } = await import('@/lib/firebase/call-invitations.service.server');

  await acceptCallInvitation(invitationId, user.firebaseId);

  return NextResponse.json({
    success: true,
    data: { invitationId, status: 'accepted' },
  });
});

const rejectHandler = asyncHandler(async (request: NextRequest, context: RouteParams) => {
  const req = request as AuthenticatedRequest;
  const { invitationId } = await context.params;

  if (!req.user) {
    throw new ApiError(ERROR_MESSAGES.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
  }

  // Get user's Firebase UID
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { firebaseId: true },
  });

  if (!user || !user.firebaseId) {
    throw new ApiError('User not found or not configured', HttpStatus.NOT_FOUND);
  }

  const { rejectCallInvitation } = await import('@/lib/firebase/call-invitations.service.server');

  await rejectCallInvitation(invitationId, user.firebaseId);

  return NextResponse.json({
    success: true,
    data: { invitationId, status: 'rejected' },
  });
});

const cancelHandler = asyncHandler(async (request: NextRequest, context: RouteParams) => {
  const req = request as AuthenticatedRequest;
  const { invitationId } = await context.params;

  if (!req.user) {
    throw new ApiError(ERROR_MESSAGES.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
  }

  // Get user's Firebase UID
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { firebaseId: true },
  });

  if (!user || !user.firebaseId) {
    throw new ApiError('User not found or not configured', HttpStatus.NOT_FOUND);
  }

  const { cancelCallInvitation } = await import('@/lib/firebase/call-invitations.service.server');

  await cancelCallInvitation(invitationId, user.firebaseId);

  return NextResponse.json({
    success: true,
    data: { invitationId, status: 'cancelled' },
  });
});

const endHandler = asyncHandler(async (request: NextRequest, context: RouteParams) => {
  const req = request as AuthenticatedRequest;
  const { invitationId } = await context.params;

  if (!req.user) {
    throw new ApiError(ERROR_MESSAGES.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
  }

  // Get user's Firebase UID
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { firebaseId: true },
  });

  if (!user || !user.firebaseId) {
    throw new ApiError('User not found or not configured', HttpStatus.NOT_FOUND);
  }

  const { endCall } = await import('@/lib/firebase/call-invitations.service.server');

  await endCall(invitationId, user.firebaseId);

  return NextResponse.json({
    success: true,
    data: { invitationId, status: 'ended' },
  });
});

const authenticatedAccept = authenticateToken(acceptHandler);
const authenticatedReject = authenticateToken(rejectHandler);
const authenticatedCancel = authenticateToken(cancelHandler);
const authenticatedEnd = authenticateToken(endHandler);

export const POST = withCorsMiddleware(
  withRateLimit(authenticatedAccept, {
    ...RateLimitPresets.STANDARD,
    maxRequests: 20,
    windowMs: 60 * 1000,
  })
);

export const DELETE = withCorsMiddleware(
  withRateLimit(authenticatedReject, {
    ...RateLimitPresets.STANDARD,
    maxRequests: 20,
    windowMs: 60 * 1000,
  })
);

// PATCH for cancel (caller cancels)
export const PATCH = withCorsMiddleware(
  withRateLimit(authenticatedCancel, {
    ...RateLimitPresets.STANDARD,
    maxRequests: 20,
    windowMs: 60 * 1000,
  })
);

// PUT for end (either party ends)
export const PUT = withCorsMiddleware(
  withRateLimit(authenticatedEnd, {
    ...RateLimitPresets.STANDARD,
    maxRequests: 20,
    windowMs: 60 * 1000,
  })
);
