// Manual Trigger Endpoint - GDPR Scheduled Account Deletions
// This endpoint can be called manually for testing or manual execution
// The actual cron job runs automatically via the custom cron service

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import {
  processScheduledDeletions,
  scheduleInactiveUsersForDeletion,
} from '@/lib/cron/scheduled-deletions-handler';

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify authorization (security)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    logger.error('Unauthorized cron request', { headers: request.headers });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Step 1: Schedule inactive users for deletion (if they meet criteria)
    logger.info('Step 1: Checking for inactive users to schedule...');
    const schedulingStats = await scheduleInactiveUsersForDeletion();

    // Step 2: Process users already scheduled for deletion
    logger.info('Step 2: Processing users scheduled for deletion...');
    const deletionStats = await processScheduledDeletions();

    return NextResponse.json({
      success: true,
      message: 'Scheduled deletions completed',
      scheduling: schedulingStats,
      deletion: deletionStats,
    });
  } catch (error: any) {
    logger.error('Fatal error during scheduled deletions', { error: error.message });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process scheduled deletions',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// Note: This endpoint can be called manually for testing
// Set CRON_SECRET in your environment variables for security
// The actual cron job runs automatically via initializeScheduledDeletionsCron()
