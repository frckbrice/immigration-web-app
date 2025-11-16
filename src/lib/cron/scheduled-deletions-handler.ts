// Scheduled Deletions Handler - Core deletion logic
// Separated from cron service for reusability and testing

import { prisma } from '@/lib/db/prisma';
import { adminAuth } from '@/lib/firebase/firebase-admin';
import { logger } from '@/lib/utils/logger';

export interface DeletionStats {
  usersDeleted: number;
  casesDeleted: number;
  documentsDeleted: number;
  messagesDeleted: number;
  notificationsDeleted: number;
  errors: number;
}

export interface SchedulingStats {
  usersScheduled: number;
  errors: number;
}

/**
 * Process scheduled account deletions
 * This is the core logic extracted from the API route
 */
export async function processScheduledDeletions(): Promise<DeletionStats> {
  const stats: DeletionStats = {
    usersDeleted: 0,
    casesDeleted: 0,
    documentsDeleted: 0,
    messagesDeleted: 0,
    notificationsDeleted: 0,
    errors: 0,
  };

  logger.info('Starting GDPR scheduled account deletions', {
    timestamp: new Date().toISOString(),
  });

  try {
    // Find users scheduled for deletion
    const usersToDelete = await prisma.user.findMany({
      where: {
        deletionScheduledFor: {
          lte: new Date(), // Deletion date has passed
        },
        isActive: false, // Should already be inactive (safety check)
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        deletionScheduledFor: true,
        deletionReason: true,
        createdAt: true,
      },
    });

    if (usersToDelete.length === 0) {
      logger.info('No accounts scheduled for deletion');
      return stats;
    }

    logger.info(`Found ${usersToDelete.length} account(s) to delete`, {
      count: usersToDelete.length,
    });

    // Process each user deletion
    for (const user of usersToDelete) {
      logger.info('Processing user deletion', {
        userId: user.id,
        email: user.email,
        scheduled: user.deletionScheduledFor?.toISOString(),
        reason: user.deletionReason,
      });

      try {
        // Delete all related data in transaction
        await prisma.$transaction(async (tx) => {
          // Delete notifications
          const deletedNotifications = await tx.notification.deleteMany({
            where: { userId: user.id },
          });
          stats.notificationsDeleted += deletedNotifications.count;

          // Delete messages (sent and received)
          const deletedMessages = await tx.message.deleteMany({
            where: {
              OR: [{ senderId: user.id }, { recipientId: user.id }],
            },
          });
          stats.messagesDeleted += deletedMessages.count;

          // Delete documents
          const deletedDocuments = await tx.document.deleteMany({
            where: { uploadedById: user.id },
          });
          stats.documentsDeleted += deletedDocuments.count;

          // Delete cases
          const deletedCases = await tx.case.deleteMany({
            where: { clientId: user.id },
          });
          stats.casesDeleted += deletedCases.count;

          // Delete activity logs
          await tx.activityLog.deleteMany({
            where: { userId: user.id },
          });

          // Delete system settings (push tokens, etc.)
          await tx.systemSetting.deleteMany({
            where: {
              key: {
                startsWith: `user:${user.id}:`,
              },
            },
          });

          // Delete invite usage records (set userId to null for audit trail)
          await tx.inviteUsage.updateMany({
            where: { userId: user.id },
            data: { userId: null },
          });

          // Delete the user
          await tx.user.delete({
            where: { id: user.id },
          });
        });

        // Delete Firebase account (outside transaction as it's external service)
        if (adminAuth) {
          try {
            await adminAuth.deleteUser(user.id);
            logger.info('Firebase account deleted', { userId: user.id });
          } catch (firebaseError: any) {
            if (firebaseError.code === 'auth/user-not-found') {
              logger.warn('Firebase account not found (already deleted)', {
                userId: user.id,
              });
            } else {
              logger.error('Failed to delete Firebase account', {
                userId: user.id,
                error: firebaseError.message,
              });
            }
          }
        }

        stats.usersDeleted++;
        logger.info('User permanently deleted', { userId: user.id });
      } catch (error: any) {
        logger.error('Error deleting user', {
          userId: user.id,
          error: error.message,
        });
        stats.errors++;
      }
    }

    logger.info('GDPR scheduled deletions completed', {
      usersDeleted: stats.usersDeleted,
      casesDeleted: stats.casesDeleted,
      documentsDeleted: stats.documentsDeleted,
      messagesDeleted: stats.messagesDeleted,
      notificationsDeleted: stats.notificationsDeleted,
      errors: stats.errors,
    });

    return stats;
  } catch (error: any) {
    logger.error('Fatal error during scheduled deletions', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Automatically schedule inactive users for deletion
 * Criteria:
 * - Users without cases for 3 months (or no cases if account is older than 3 months)
 * - Users who haven't logged in for 6 months (or never logged in if account is older than 6 months)
 * - Only CLIENT role users
 * - Active users not already scheduled for deletion
 */
export async function scheduleInactiveUsersForDeletion(): Promise<SchedulingStats> {
  const stats: SchedulingStats = {
    usersScheduled: 0,
    errors: 0,
  };

  logger.info('Starting automatic scheduling of inactive users for deletion', {
    timestamp: new Date().toISOString(),
  });

  try {
    const now = new Date();

    // Calculate threshold dates
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Calculate deletion date (30 days from now, same as manual deletion)
    const deletionDate = new Date(now);
    deletionDate.setDate(deletionDate.getDate() + 30);

    // Find all active CLIENT users not already scheduled for deletion
    const activeClients = await prisma.user.findMany({
      where: {
        role: 'CLIENT',
        isActive: true,
        deletionScheduledFor: null, // Not already scheduled
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        lastLogin: true,
        cases: {
          select: {
            id: true,
            submissionDate: true, // Case model uses submissionDate, not createdAt
          },
          orderBy: {
            submissionDate: 'desc', // Order by submissionDate
          },
          take: 1, // Only need the most recent case
        },
      },
    });

    logger.info(`Found ${activeClients.length} active CLIENT users to check`, {
      count: activeClients.length,
    });

    // Filter users who meet the criteria
    const usersToSchedule: Array<{
      id: string;
      email: string;
      reason: string;
    }> = [];

    for (const user of activeClients) {
      try {
        // Check login inactivity (6 months)
        const lastLoginDate = user.lastLogin || user.createdAt; // Use createdAt if never logged in
        const isLoginInactive = lastLoginDate < sixMonthsAgo;

        // Check case inactivity (3 months)
        let isCaseInactive = false;
        let inactivityReason = '';

        if (user.cases.length === 0) {
          // User has no cases - check if account is older than 3 months
          if (user.createdAt < threeMonthsAgo) {
            isCaseInactive = true;
            inactivityReason = 'No cases created and account older than 3 months';
          }
        } else {
          // User has cases - check if last case is older than 3 months
          const lastCaseDate = user.cases[0].submissionDate;
          if (lastCaseDate < threeMonthsAgo) {
            isCaseInactive = true;
            inactivityReason = `Last case created more than 3 months ago (${lastCaseDate.toISOString()})`;
          }
        }

        // Schedule if both conditions are met
        if (isLoginInactive && isCaseInactive) {
          const loginReason = user.lastLogin
            ? `Last login: ${user.lastLogin.toISOString()} (more than 6 months ago)`
            : `Never logged in, account created: ${user.createdAt.toISOString()} (more than 6 months ago)`;

          usersToSchedule.push({
            id: user.id,
            email: user.email,
            reason: `${loginReason}. ${inactivityReason}.`,
          });
        }
      } catch (error: any) {
        logger.error('Error checking user inactivity criteria', {
          userId: user.id,
          error: error.message,
        });
        stats.errors++;
      }
    }

    if (usersToSchedule.length === 0) {
      logger.info('No inactive users found to schedule for deletion');
      return stats;
    }

    logger.info(`Found ${usersToSchedule.length} inactive user(s) to schedule for deletion`, {
      count: usersToSchedule.length,
    });

    // Schedule each user for deletion
    for (const userToSchedule of usersToSchedule) {
      try {
        await prisma.user.update({
          where: { id: userToSchedule.id },
          data: {
            isActive: false, // Mark inactive immediately
            deletionScheduledFor: deletionDate, // Schedule deletion in 30 days
            deletionReason: `Automatic scheduling: ${userToSchedule.reason}`,
          },
        });

        // Disable Firebase account (prevent login)
        if (adminAuth) {
          try {
            await adminAuth.updateUser(userToSchedule.id, {
              disabled: true,
            });
            logger.info('Firebase account disabled for inactive user', {
              userId: userToSchedule.id,
            });
          } catch (firebaseError: any) {
            if (firebaseError.code !== 'auth/user-not-found') {
              logger.error('Failed to disable Firebase account for inactive user', {
                userId: userToSchedule.id,
                error: firebaseError.message,
              });
            }
          }
        }

        stats.usersScheduled++;
        logger.info('Inactive user scheduled for deletion', {
          userId: userToSchedule.id,
          email: userToSchedule.email,
          scheduledFor: deletionDate.toISOString(),
          reason: userToSchedule.reason,
        });
      } catch (error: any) {
        logger.error('Error scheduling inactive user for deletion', {
          userId: userToSchedule.id,
          error: error.message,
        });
        stats.errors++;
      }
    }

    logger.info('Automatic scheduling of inactive users completed', {
      usersScheduled: stats.usersScheduled,
      errors: stats.errors,
    });

    return stats;
  } catch (error: any) {
    logger.error('Fatal error during automatic scheduling of inactive users', {
      error: error.message,
    });
    throw error;
  }
}
