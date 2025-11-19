// PATCH /api/cases/[id]/status - Update case status (AGENT/ADMIN only)

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { ERROR_MESSAGES, NOTIFICATION_ACTION_URLS } from '@/lib/constants';
import { logger } from '@/lib/utils/logger';
import { successResponse } from '@/lib/utils/api-response';
import { asyncHandler, ApiError, HttpStatus } from '@/lib/utils/error-handler';
import { withCorsMiddleware } from '@/lib/middleware/cors';
import { withRateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit';
import { authenticateToken, AuthenticatedRequest } from '@/lib/auth/middleware';
import { sendCaseStatusEmail } from '@/lib/notifications/email.service';
import { createRealtimeNotification } from '@/lib/firebase/notifications.service.server';
import { sendPushNotificationToUser } from '@/lib/notifications/expo-push.service';

const handler = asyncHandler(
  async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const params = await context.params;

    const req = request as AuthenticatedRequest;

    if (!req.user || !['AGENT', 'ADMIN'].includes(req.user.role)) {
      throw new ApiError(ERROR_MESSAGES.FORBIDDEN, HttpStatus.FORBIDDEN);
    }

    const VALID_STATUSES = [
      'SUBMITTED',
      'UNDER_REVIEW',
      'DOCUMENTS_REQUIRED',
      'PROCESSING',
      'APPROVED',
      'REJECTED',
      'CLOSED',
    ] as const;

    const body = await request.json();
    const { status, note } = body;

    if (!status) {
      throw new ApiError('Status is required', HttpStatus.BAD_REQUEST);
    }

    if (!VALID_STATUSES.includes(status)) {
      throw new ApiError('Invalid status value', HttpStatus.BAD_REQUEST);
    }

    // Fetch case for resource-level authorization
    const existingCase = await prisma.case.findUnique({
      where: { id: params.id },
      select: { assignedAgentId: true, status: true },
    });

    if (!existingCase) {
      throw new ApiError(ERROR_MESSAGES.NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    // Prevent updating approved cases (only ADMIN can update approved cases)
    if (existingCase.status === 'APPROVED' && req.user.role !== 'ADMIN') {
      throw new ApiError(
        'Cannot update status of an approved case. Only administrators can modify approved cases.',
        HttpStatus.BAD_REQUEST
      );
    }

    // Resource-level authorization: only ADMIN or the assigned agent can update status
    if (req.user.role !== 'ADMIN') {
      if (existingCase.assignedAgentId !== req.user.userId) {
        throw new ApiError(ERROR_MESSAGES.FORBIDDEN, HttpStatus.FORBIDDEN);
      }
    }

    const caseData = await prisma.case.update({
      where: { id: params.id },
      data: { status },
      include: {
        client: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            street: true,
            city: true,
            country: true,
          },
        },
        assignedAgent: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        documents: {
          select: {
            id: true,
            fileName: true,
            originalName: true,
            filePath: true,
            mimeType: true,
            fileSize: true,
            documentType: true,
            status: true,
            uploadDate: true,
          },
        },
      },
    });

    // Create status history
    await prisma.statusHistory.create({
      data: {
        caseId: params.id,
        status,
        changedBy: req.user.userId,
        notes: note,
      },
    });

    // Send notifications
    try {
      // Compute a safe display name for the client
      const firstNamePart = (caseData.client.firstName || '').trim();
      const lastNamePart = (caseData.client.lastName || '').trim();
      const nameParts = [firstNamePart, lastNamePart].filter((part) => part.length > 0);
      const clientDisplayName =
        nameParts.length > 0 ? nameParts.join(' ') : caseData.client.email || 'Client';

      const statusDisplayText = status.replace(/_/g, ' ').toLowerCase();
      const actionUrl = NOTIFICATION_ACTION_URLS.CASE_STATUS_UPDATE(params.id);

      // 1. Create notification in PostgreSQL database first
      const notification = await prisma.notification.create({
        data: {
          userId: caseData.clientId,
          caseId: params.id,
          type: 'CASE_STATUS_UPDATE',
          title: 'Case Status Updated',
          message: `Your case ${caseData.referenceNumber} is now ${statusDisplayText}`,
          actionUrl,
          isRead: false,
        },
      });

      // Compute badge count for push notification (after creating notification)
      let clientBadge: number | undefined;
      try {
        const unread = await prisma.notification.count({
          where: { userId: caseData.clientId, isRead: false },
        });
        clientBadge = unread > 0 ? unread : undefined;
      } catch (badgeErr) {
        logger.warn('Failed to compute badge count for push notification', badgeErr);
      }

      // 2. Send all notifications in parallel (fire-and-forget for non-critical ones)
      await Promise.allSettled([
        // Send email notification to CLIENT
        sendCaseStatusEmail(
          caseData.client.email,
          caseData.referenceNumber,
          status,
          clientDisplayName
        ),
        // Send realtime notification to CLIENT (web dashboard)
        createRealtimeNotification(caseData.clientId, {
          type: 'CASE_STATUS_UPDATE',
          title: 'Case Status Updated',
          message: `Your case ${caseData.referenceNumber} is now ${statusDisplayText}`,
          actionUrl,
        }),
        // Send mobile push notification to CLIENT
        sendPushNotificationToUser(caseData.clientId, {
          title: 'Case Status Updated',
          body: `Your case ${caseData.referenceNumber} is now ${statusDisplayText}`,
          data: {
            type: 'CASE_STATUS_UPDATE',
            caseId: params.id,
            notificationId: notification.id,
            actionUrl,
            screen: 'cases',
            params: { caseId: params.id },
          },
          badge: clientBadge,
          channelId: 'cases',
        }),
      ]);
    } catch (error) {
      logger.warn('Notification failed but status updated', error);
    }

    logger.info('Case status updated', { caseId: params.id, status, updatedBy: req.user.userId });

    return successResponse({ case: caseData }, 'Status updated successfully');
  }
);

export const PATCH = withCorsMiddleware(
  withRateLimit(authenticateToken(handler), RateLimitPresets.STANDARD)
);
