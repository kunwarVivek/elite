import express from 'express';
import { exitManagementController } from '../controllers/exit-management.controller.js';
import { authenticate } from '../middleware/auth.js';
import { featureGate, requireTier } from '../middleware/feature-gate.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/exit-events
 * @desc    Create exit event
 * @access  Private (Founder/Admin) - Requires Pro tier or higher
 */
router.post(
  '/',
  featureGate('capTableManagement'),
  exitManagementController.createExitEvent.bind(exitManagementController)
);

/**
 * @route   GET /api/exit-events
 * @desc    Get all exit events
 * @access  Private
 */
router.get('/', exitManagementController.getAllExitEvents.bind(exitManagementController));

/**
 * @route   GET /api/exit-events/:id
 * @desc    Get exit event by ID
 * @access  Private
 */
router.get('/:id', exitManagementController.getExitEvent.bind(exitManagementController));

/**
 * @route   GET /api/exit-events/startup/:startupId
 * @desc    Get exit events by startup
 * @access  Private
 */
router.get('/startup/:startupId', exitManagementController.getExitEventsByStartup.bind(exitManagementController));

/**
 * @route   GET /api/exit-events/startup/:startupId/metrics
 * @desc    Get exit metrics for startup
 * @access  Private
 */
router.get('/startup/:startupId/metrics', exitManagementController.getExitMetrics.bind(exitManagementController));

/**
 * @route   PUT /api/exit-events/:id
 * @desc    Update exit event
 * @access  Private (Founder/Admin)
 */
router.put('/:id', exitManagementController.updateExitEvent.bind(exitManagementController));

/**
 * @route   GET /api/exit-events/:id/calculate-distributions
 * @desc    Calculate exit distributions
 * @access  Private - Requires Growth tier or higher for waterfall analysis
 */
router.get(
  '/:id/calculate-distributions',
  featureGate('waterfallAnalysis'),
  requireTier('GROWTH'),
  exitManagementController.calculateDistributions.bind(exitManagementController)
);

/**
 * @route   POST /api/exit-events/:id/distributions
 * @desc    Create distribution
 * @access  Private (Founder/Admin) - Requires Growth tier or higher
 */
router.post(
  '/:id/distributions',
  featureGate('waterfallAnalysis'),
  requireTier('GROWTH'),
  exitManagementController.createDistribution.bind(exitManagementController)
);

/**
 * @route   GET /api/exit-events/:id/distributions
 * @desc    Get distributions by exit event
 * @access  Private
 */
router.get('/:id/distributions', exitManagementController.getDistributionsByExitEvent.bind(exitManagementController));

/**
 * @route   GET /api/exit-events/investor/:investorId/distributions
 * @desc    Get distributions by investor
 * @access  Private (Investor/Admin)
 */
router.get('/investor/:investorId/distributions', exitManagementController.getDistributionsByInvestor.bind(exitManagementController));

/**
 * @route   POST /api/exit-events/distributions/:distributionId/process
 * @desc    Process distribution
 * @access  Private (Admin)
 */
router.post('/distributions/:distributionId/process', exitManagementController.processDistribution.bind(exitManagementController));

/**
 * @route   POST /api/exit-events/distributions/:distributionId/complete
 * @desc    Complete distribution
 * @access  Private (Admin)
 */
router.post('/distributions/:distributionId/complete', exitManagementController.completeDistribution.bind(exitManagementController));

export default router;
