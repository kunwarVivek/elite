import { Router } from 'express'
import { subscriptionController } from '../controllers/subscription.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

// All routes require authentication
router.use(authenticate)

// User subscription routes
router.post('/', subscriptionController.createSubscription.bind(subscriptionController))
router.get('/me', subscriptionController.getMySubscription.bind(subscriptionController))
router.get('/:id', subscriptionController.getSubscriptionById.bind(subscriptionController))
router.get('/', subscriptionController.getAllSubscriptions.bind(subscriptionController))
router.patch('/:id', subscriptionController.updateSubscription.bind(subscriptionController))
router.post('/:id/cancel', subscriptionController.cancelSubscription.bind(subscriptionController))
router.post('/:id/reactivate', subscriptionController.reactivateSubscription.bind(subscriptionController))

// Feature and limit checks
router.get('/check-feature/:featureName', subscriptionController.checkFeatureAccess.bind(subscriptionController))
router.get('/check-limit/:limitName', subscriptionController.checkUsageLimit.bind(subscriptionController))
router.post('/track-usage', subscriptionController.trackUsage.bind(subscriptionController))

// Stripe integration routes
router.post('/stripe/setup-intent', subscriptionController.createSetupIntent.bind(subscriptionController))
router.post('/stripe/create', subscriptionController.createStripeSubscription.bind(subscriptionController))
router.post('/stripe/billing-portal', subscriptionController.createBillingPortalSession.bind(subscriptionController))
router.get('/stripe/upcoming-invoice', subscriptionController.getUpcomingInvoice.bind(subscriptionController))
router.get('/stripe/payment-methods', subscriptionController.listPaymentMethods.bind(subscriptionController))

// Admin routes
router.get('/metrics/revenue', subscriptionController.getRevenueMetrics.bind(subscriptionController))
router.post('/:id/renew', subscriptionController.processRenewal.bind(subscriptionController))
router.post('/:id/trial-expiry', subscriptionController.handleTrialExpiry.bind(subscriptionController))

// Subscription plans routes
const plansRouter = Router()
plansRouter.get('/', subscriptionController.getSubscriptionPlans.bind(subscriptionController))
plansRouter.post('/', authenticate, subscriptionController.upsertSubscriptionPlan.bind(subscriptionController))

export { router as subscriptionRouter, plansRouter as subscriptionPlansRouter }
