import express from 'express';
import { equityRoundController } from '../controllers/equity-round.controller.js';
import { authenticate } from '../middleware/auth.js';
import { featureGate, usageLimit, trackUsageAfter } from '../middleware/feature-gate.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/equity-rounds
 * @desc    Create a new equity round
 * @access  Private (Founder/Admin) - Requires Pro tier or higher
 */
router.post(
  '/',
  featureGate('capTableManagement'),
  equityRoundController.createEquityRound.bind(equityRoundController)
);

/**
 * @route   GET /api/equity-rounds/active
 * @desc    Get all active equity rounds
 * @access  Private
 */
router.get('/active', equityRoundController.getActiveEquityRounds.bind(equityRoundController));

/**
 * @route   GET /api/equity-rounds/:id
 * @desc    Get equity round by ID
 * @access  Private
 */
router.get('/:id', equityRoundController.getEquityRound.bind(equityRoundController));

/**
 * @route   GET /api/equity-rounds/startup/:startupId
 * @desc    Get equity rounds by startup
 * @access  Private
 */
router.get('/startup/:startupId', equityRoundController.getEquityRoundsByStartup.bind(equityRoundController));

/**
 * @route   PUT /api/equity-rounds/:id
 * @desc    Update equity round
 * @access  Private (Founder/Admin)
 */
router.put('/:id', equityRoundController.updateEquityRound.bind(equityRoundController));

/**
 * @route   POST /api/equity-rounds/:id/close
 * @desc    Close equity round
 * @access  Private (Founder/Admin)
 */
router.post('/:id/close', equityRoundController.closeEquityRound.bind(equityRoundController));

/**
 * @route   GET /api/equity-rounds/:id/metrics
 * @desc    Get round metrics
 * @access  Private - Requires Pro tier or higher for advanced analytics
 */
router.get(
  '/:id/metrics',
  featureGate('portfolioAnalytics'),
  equityRoundController.getRoundMetrics.bind(equityRoundController)
);

/**
 * @route   POST /api/equity-rounds/:id/investments
 * @desc    Record investment in round
 * @access  Private (Founder/Admin) - Tracks investment usage
 */
router.post(
  '/:id/investments',
  usageLimit('investments'),
  equityRoundController.recordInvestment.bind(equityRoundController),
  trackUsageAfter('investments', 1)
);

export default router;
