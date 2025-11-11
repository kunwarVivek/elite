import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller.js';
import express from 'express';

const router = Router();

/**
 * Stripe Webhook Routes
 *
 * IMPORTANT: These routes use raw body parsing (not JSON) for signature verification
 * The raw body middleware must be applied in server.ts BEFORE the JSON middleware
 */

/**
 * @route   POST /api/webhooks/stripe
 * @desc    Handle Stripe webhook events
 * @access  Public (verified by Stripe signature)
 *
 * This endpoint must:
 * 1. Receive raw request body (buffer) for signature verification
 * 2. Verify the Stripe signature using STRIPE_WEBHOOK_SECRET
 * 3. Process the event and update database accordingly
 *
 * Webhook Events Handled:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - customer.subscription.trial_will_end
 * - invoice.paid
 * - invoice.payment_failed
 * - invoice.upcoming
 * - payment_method.attached
 * - payment_method.detached
 * - customer.updated
 */
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }), // Parse as raw buffer for signature verification
  webhookController.handleStripeWebhook.bind(webhookController)
);

/**
 * @route   GET /api/webhooks/stripe/health
 * @desc    Health check for webhook endpoint
 * @access  Public
 */
router.get('/stripe/health', (req, res) => {
  res.json({
    success: true,
    message: 'Stripe webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
});

export default router;
