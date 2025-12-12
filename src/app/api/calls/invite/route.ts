/**
 * Call Invitation API
 * Creates a call invitation and sends notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateToken, AuthenticatedRequest } from '@/lib/auth/middleware';
import { ERROR_MESSAGES } from '@/lib/constants';
import { ApiError, HttpStatus, asyncHandler } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';
import { withCorsMiddleware } from '@/lib/middleware/cors';
import { withRateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit';
import { prisma } from '@/lib/db/prisma';
import { sendPushNotificationToUser } from '@/lib/notifications/expo-push.service';
import { createRealtimeNotification } from '@/lib/firebase/notifications.service.server';

interface InviteRequestBody {
  toFirebaseId: string; // Firebase UID of recipient
  toUserName: string;
  callMode: 'video' | 'audio';
}

const postHandler = asyncHandler(async (request: NextRequest) => {
  const req = request as AuthenticatedRequest;

  if (!req.user) {
    throw new ApiError(ERROR_MESSAGES.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
  }

  let body: InviteRequestBody;

  try {
    body = (await request.json()) as InviteRequestBody;
  } catch (error) {
    logger.warn('Invalid JSON payload for call invitation', { error });
    throw new ApiError('Invalid JSON payload', HttpStatus.BAD_REQUEST);
  }

  const { toFirebaseId, toUserName, callMode } = body;

  if (!toFirebaseId || typeof toFirebaseId !== 'string') {
    throw new ApiError('toFirebaseId is required and must be a string', HttpStatus.BAD_REQUEST);
  }

  if (!toUserName || typeof toUserName !== 'string') {
    throw new ApiError('toUserName is required and must be a string', HttpStatus.BAD_REQUEST);
  }

  if (callMode !== 'video' && callMode !== 'audio') {
    throw new ApiError('callMode must be "video" or "audio"', HttpStatus.BAD_REQUEST);
  }

  // Get caller's Firebase UID and info
  const caller = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, firebaseId: true, firstName: true, lastName: true },
  });

  if (!caller || !caller.firebaseId) {
    throw new ApiError('Caller not found or not configured', HttpStatus.NOT_FOUND);
  }

  // Get recipient's PostgreSQL ID for push notifications
  const recipient = await prisma.user.findUnique({
    where: { firebaseId: toFirebaseId },
    select: { id: true, firebaseId: true },
  });

  if (!recipient) {
    throw new ApiError('Recipient not found', HttpStatus.NOT_FOUND);
  }

  const callerName = `${caller.firstName} ${caller.lastName}`.trim();
  const recipientName = toUserName;

  // Import and create call invitation (SERVER: use Admin SDK to bypass RTDB rules)
  const { createCallInvitation } = await import('@/lib/firebase/call-invitations.service.server');

  const invitation = await createCallInvitation(
    caller.firebaseId,
    callerName,
    toFirebaseId,
    recipientName,
    callMode
  );

  // Web action URL (used by web realtime notifications + any web UI navigation)
  const actionUrl = `/dashboard/messages`;

  // Send push notification to recipient (mobile)
  const callType = callMode === 'video' ? 'Video' : 'Audio';
  sendPushNotificationToUser(recipient.id, {
    title: `Incoming ${callType} Call`,
    body: `${callerName} is calling you`,
    data: {
      type: 'INCOMING_CALL',
      invitationId: invitation.id,
      roomId: invitation.roomId,
      // IMPORTANT: Use Firebase UID (RTDB rules + roomId generation are Firebase-UID based)
      fromUserId: caller.firebaseId,
      fromUserName: callerName,
      callMode,
      actionUrl,
    },
    channelId: 'calls',
    priority: 'high',
  }).catch((error) => {
    logger.warn('Failed to send push notification for call invitation', {
      error,
      recipientId: recipient.id,
    });
  });

  // Send real-time notification (web)
  createRealtimeNotification(recipient.id, {
    type: 'INCOMING_CALL',
    title: `Incoming ${callType} Call`,
    message: `${callerName} is calling you`,
    actionUrl,
    // Extra metadata for in-app "Answer" action (ignored by clients that don't use it)
    invitationId: invitation.id,
    roomId: invitation.roomId,
    callMode,
    fromUserName: callerName,
  }).catch((error) => {
    logger.warn('Failed to create real-time notification for call invitation', {
      error,
      recipientId: recipient.id,
    });
  });

  return NextResponse.json({
    success: true,
    data: {
      invitationId: invitation.id,
      roomId: invitation.roomId,
      status: invitation.status,
    },
  });
});

const authenticatedPost = authenticateToken(postHandler);

export const POST = withCorsMiddleware(
  withRateLimit(authenticatedPost, {
    ...RateLimitPresets.STANDARD,
    maxRequests: 10,
    windowMs: 60 * 1000,
  })
);
