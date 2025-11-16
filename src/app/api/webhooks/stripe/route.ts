/**
 * Stripe Webhook Handler
 * Handles payment_intent.succeeded events to update user payment status
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/services/stripe';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!stripe) {
    logger.error('Stripe is not configured');
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  if (!webhookSecret) {
    logger.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    logger.error('Missing stripe-signature header');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    logger.error('Webhook signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle the event
  try {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      logger.info('Payment intent succeeded', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        metadata: paymentIntent.metadata,
      });

      // Find payment in database
      const payment = await prisma.payment.findUnique({
        where: { stripeIntentId: paymentIntent.id },
        include: { user: true },
      });

      if (!payment) {
        logger.warn('Payment not found in database', { paymentIntentId: paymentIntent.id });
        return NextResponse.json({ received: true });
      }

      // Update payment status
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
        },
      });

      // Extract tier from metadata
      const tier = paymentIntent.metadata?.tier;
      const userId = payment.userId;

      if (tier && (tier === 'basic' || tier === 'standard' || tier === 'premium')) {
        // Update user payment status
        // Store tier in uppercase for consistency (BASIC, STANDARD, PREMIUM)
        const tierUpper = tier.toUpperCase();
        await prisma.user.update({
          where: { id: userId },
          data: {
            hasPaid: true,
            subscriptionTier: tierUpper,
            paymentDate: new Date(),
            // Set expiration to 1 year from now (for tracking purposes, even though it's one-time)
            subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });

        logger.info('User payment status updated', {
          userId,
          tier,
          paymentIntentId: paymentIntent.id,
        });
      } else {
        logger.warn('Invalid or missing tier in payment metadata', {
          paymentIntentId: paymentIntent.id,
          metadata: paymentIntent.metadata,
        });
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      logger.info('Payment intent failed', {
        paymentIntentId: paymentIntent.id,
      });

      // Update payment status in database
      const payment = await prisma.payment.findUnique({
        where: { stripeIntentId: paymentIntent.id },
      });

      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
          },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Error processing webhook', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Disable body parsing for webhooks (Stripe needs raw body)
export const runtime = 'nodejs';

// Next.js App Router configuration to prevent body parsing
export const dynamic = 'force-dynamic';
