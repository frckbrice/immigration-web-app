// Custom Cron Service - GDPR Scheduled Account Deletions
// Runs daily at 2:00 AM UTC
// This service runs independently of Vercel infrastructure

import * as cron from 'node-cron';
import { logger } from '@/lib/utils/logger';

let cronJob: cron.ScheduledTask | null = null;
let isRunning = false;

/**
 * Execute the scheduled deletions task
 * This function contains the actual deletion logic
 */
async function executeScheduledDeletions(): Promise<void> {
  // Prevent concurrent executions
  if (isRunning) {
    logger.warn('Scheduled deletions already running, skipping this execution');
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    // Dynamic import to avoid loading heavy dependencies during module initialization
    const { processScheduledDeletions, scheduleInactiveUsersForDeletion } = await import(
      './scheduled-deletions-handler.js'
    );

    // Step 1: Schedule inactive users for deletion (if they meet criteria)
    logger.info('Step 1: Checking for inactive users to schedule...');
    const schedulingStats = await scheduleInactiveUsersForDeletion();
    logger.info('Inactive users scheduling completed', {
      usersScheduled: schedulingStats.usersScheduled,
      errors: schedulingStats.errors,
    });

    // Step 2: Process users already scheduled for deletion
    logger.info('Step 2: Processing users scheduled for deletion...');
    await processScheduledDeletions();
  } catch (error: any) {
    logger.error('Error executing scheduled deletions cron job', {
      error: error.message,
      stack: error.stack,
    });
  } finally {
    isRunning = false;
    const duration = Date.now() - startTime;
    logger.info('Scheduled deletions cron job completed', {
      duration: `${duration}ms`,
    });
  }
}

/**
 * Initialize the cron job
 * Schedule: Daily at 2:00 AM UTC (0 2 * * *)
 * Only runs on server-side (not in browser)
 */
export function initializeScheduledDeletionsCron(): void {
  // Only run on server-side
  if (typeof window !== 'undefined') {
    return;
  }

  // Don't initialize if already initialized
  if (cronJob !== null) {
    logger.warn('Scheduled deletions cron job already initialized');
    return;
  }

  // Schedule: Daily at 2:00 AM UTC
  // Cron expression: "0 2 * * *" = minute 0, hour 2, every day
  const cronExpression = process.env.CRON_SCHEDULE || '0 2 * * *';
  const timezone = process.env.CRON_TIMEZONE || 'UTC';

  try {
    cronJob = cron.schedule(
      cronExpression,
      () => {
        logger.info('Scheduled deletions cron job triggered', {
          schedule: cronExpression,
          timezone,
          timestamp: new Date().toISOString(),
        });
        executeScheduledDeletions().catch((error) => {
          logger.error('Unhandled error in scheduled deletions cron', error);
        });
      },
      {
        timezone,
      }
    );

    logger.info('Scheduled deletions cron job initialized', {
      schedule: cronExpression,
      timezone,
    });
  } catch (error: any) {
    logger.error('Failed to initialize scheduled deletions cron job', {
      error: error.message,
      cronExpression,
      timezone,
    });
  }
}

/**
 * Stop the cron job (useful for testing or graceful shutdown)
 */
export function stopScheduledDeletionsCron(): void {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    logger.info('Scheduled deletions cron job stopped');
  }
}

/**
 * Get cron job status
 */
export function getCronStatus(): {
  initialized: boolean;
  running: boolean;
} {
  return {
    initialized: cronJob !== null,
    running: isRunning,
  };
}
