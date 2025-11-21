import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/firebase-admin';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';
import { normalizeEmail } from '@/lib/utils/email';
import { prisma } from '@/lib/db/prisma';
import { sendPasswordResetEmail } from '@/lib/notifications/email.service';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * Forgot Password API Endpoint
 * Generates and sends password reset email via Firebase Admin
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = forgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues[0].message,
        },
        { status: 400 }
      );
    }

    const email = normalizeEmail(validation.data.email);
    // Use APP_URL for server-side (not NEXT_PUBLIC_APP_URL which is for client-side)
    const appUrl = process.env.APP_URL;

    if (!appUrl) {
      logger.error('APP_URL not configured');
      return NextResponse.json(
        {
          success: false,
          error: 'Application URL not configured',
        },
        { status: 500 }
      );
    }

    if (!adminAuth) {
      logger.error('Firebase Admin not initialized');
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication service unavailable',
        },
        { status: 500 }
      );
    }

    try {
      // Check if user exists in Firebase
      const userRecord = await adminAuth.getUserByEmail(email);

      // Generate password reset link using Firebase Admin SDK
      let resetLink: string;
      try {
        resetLink = await adminAuth.generatePasswordResetLink(email, {
          url: `${appUrl}/reset-password`,
        });
      } catch (linkError: any) {
        // Handle domain not allowlisted error
        if (
          linkError.message?.includes('Domain not allowlisted') ||
          linkError.message?.includes('not allowlisted by project')
        ) {
          logger.error('Domain not allowlisted in Firebase', {
            appUrl,
            error: linkError.message,
            hint: 'Add the domain to Firebase Console > Authentication > Settings > Authorized domains',
          });
          return NextResponse.json(
            {
              success: false,
              error:
                'Password reset service is not properly configured. Please contact support.',
              message:
                'The application domain needs to be authorized in Firebase. Please contact the administrator.',
            },
            { status: 500 }
          );
        }
        throw linkError;
      }

      logger.info('Password reset link generated', {
        userId: userRecord.uid,
        email: email,
      });

      // Get user name from database if available
      let userName: string | undefined;
      try {
        const dbUser = await prisma.user.findUnique({
          where: { email },
          select: { firstName: true, lastName: true },
        });
        if (dbUser?.firstName && dbUser?.lastName) {
          userName = `${dbUser.firstName} ${dbUser.lastName}`;
        } else if (dbUser?.firstName) {
          userName = dbUser.firstName;
        }
      } catch (_dbError) {
        // If database lookup fails, continue without name
        logger.warn('Could not fetch user name from database', { email });
      }

      // Send password reset email using Nodemailer service
      try {
        await sendPasswordResetEmail({
          to: email,
          clientName: userName || userRecord.displayName || 'there',
          resetLink,
        });
        logger.info('Password reset email sent successfully', { email });
      } catch (emailError) {
        // Log email error but don't fail the request
        // The link was generated successfully, user can request another email
        logger.error('Failed to send password reset email', emailError);
        // Still return success to avoid revealing if user exists
      }

      // For security, always return success (don't reveal if user exists)
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent',
      });
    } catch (error: any) {
      // Handle Firebase errors
      if (error.code === 'auth/user-not-found') {
        logger.warn('Password reset attempted for non-existent email', { email });
        return NextResponse.json({
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent',
        });
      }

      // Re-throw domain allowlist errors (already handled above)
      if (
        error.message?.includes('Domain not allowlisted') ||
        error.message?.includes('not allowlisted by project')
      ) {
        throw error;
      }

      throw error;
    }
  } catch (error: any) {
    logger.error('Forgot password error', { error: error.message });

    // Don't expose internal error details to client for security
    const isDomainError =
      error.message?.includes('Domain not allowlisted') ||
      error.message?.includes('not allowlisted by project');

    return NextResponse.json(
      {
        success: false,
        error: isDomainError
          ? 'Password reset service is not properly configured. Please contact support.'
          : 'Failed to process password reset request',
        message: isDomainError
          ? 'The application domain needs to be authorized in Firebase. Please contact the administrator.'
          : 'An error occurred while processing your request. Please try again later.',
      },
      { status: 500 }
    );
  }
}
