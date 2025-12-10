// Next.js Instrumentation Hook
// This file runs once when the server starts
// Used to initialize cron jobs and other server-side services
// Ensures proper formatting for CI/CD pipeline

export async function register() {
  // Only run on server-side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialize cron jobs
    const { initializeScheduledDeletionsCron } = await import(
      '@/lib/cron/scheduled-deletions.service'
    );
    initializeScheduledDeletionsCron();
  }
}
