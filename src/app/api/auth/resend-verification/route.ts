import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/firebase-admin';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';
import { normalizeEmail } from '@/lib/utils/email';
import { prisma } from '@/lib/db/prisma';
import { sendVerificationEmail } from '@/lib/notifications/email.service';

const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * Resend Email Verification API Endpoint
 * Generates and sends a new email verification link
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = resendVerificationSchema.safeParse(body);
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
      // Get user by email
      const userRecord = await adminAuth.getUserByEmail(email);

      // Check if already verified
      if (userRecord.emailVerified) {
        return NextResponse.json(
          {
            success: false,
            error: 'Email is already verified',
          },
          { status: 400 }
        );
      }

      // Generate email verification link
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
      const verificationLink = await adminAuth.generateEmailVerificationLink(email, {
        url: `${appUrl}/login?verified=true`,
      });

      logger.info('Email verification link generated', {
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

      // Send verification email using Nodemailer service
      try {
        await sendVerificationEmail({
          to: email,
          clientName: userName || userRecord.displayName || 'there',
          verificationLink,
        });
        logger.info('Verification email sent successfully', { email });
      } catch (emailError) {
        // Log email error but don't fail the request
        // The link was generated successfully, user can request another email
        logger.error('Failed to send verification email', emailError);
        // Still return success to avoid revealing if user exists
      }

      // For security, always return success (don't reveal if user exists)
      return NextResponse.json({
        success: true,
        message:
          'If an account exists with this email and is not yet verified, a verification link has been sent',
      });
    } catch (error: any) {
      // Handle Firebase errors
      if (error.code === 'auth/user-not-found') {
        logger.warn('Verification resend attempted for non-existent email', { email });
        // For security, always return success (don't reveal if user exists)
        return NextResponse.json({
          success: true,
          message:
            'If an account exists with this email and is not yet verified, a verification link has been sent',
        });
      }

      throw error;
    }
  } catch (error: any) {
    logger.error('Resend verification error', { error: error.message });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send verification email',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
