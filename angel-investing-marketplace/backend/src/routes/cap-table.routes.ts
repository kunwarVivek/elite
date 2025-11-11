import express from 'express';
import { capTableController } from '../controllers/cap-table.controller.js';
import { authenticate } from '../middleware/auth.js';
import { featureGate, requireTier } from '../middleware/feature-gate.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/cap-tables
 * @desc    Create a new cap table snapshot
 * @access  Private (Founder/Admin) - Requires Pro tier or higher
 */
router.post(
  '/',
  featureGate('capTableManagement'),
  capTableController.createCapTable.bind(capTableController)
);

/**
 * @route   GET /api/cap-tables/:id
 * @desc    Get cap table by ID
 * @access  Private (Founder/Admin/Stakeholder)
 */
router.get('/:id', capTableController.getCapTable.bind(capTableController));

/**
 * @route   GET /api/cap-tables/startup/:startupId/latest
 * @desc    Get latest cap table for startup
 * @access  Private (Founder/Admin/Stakeholder)
 */
router.get('/startup/:startupId/latest', capTableController.getLatestCapTable.bind(capTableController));

/**
 * @route   GET /api/cap-tables/startup/:startupId/history
 * @desc    Get cap table history for startup
 * @access  Private (Founder/Admin)
 */
router.get('/startup/:startupId/history', capTableController.getCapTableHistory.bind(capTableController));

/**
 * @route   POST /api/cap-tables/:id/stakeholders
 * @desc    Add stakeholder to cap table
 * @access  Private (Founder/Admin)
 */
router.post('/:id/stakeholders', capTableController.addStakeholder.bind(capTableController));

/**
 * @route   POST /api/cap-tables/startup/:startupId/dilution
 * @desc    Calculate dilution from new round
 * @access  Private (Founder/Admin) - Requires Pro tier or higher
 */
router.post(
  '/startup/:startupId/dilution',
  featureGate('dilutionCalculator'),
  capTableController.calculateDilution.bind(capTableController)
);

/**
 * @route   POST /api/cap-tables/startup/:startupId/waterfall
 * @desc    Calculate exit waterfall distribution
 * @access  Private (Founder/Admin) - Requires Growth tier or higher
 */
router.post(
  '/startup/:startupId/waterfall',
  featureGate('waterfallAnalysis'),
  requireTier('GROWTH'),
  capTableController.calculateWaterfall.bind(capTableController)
);

/**
 * @route   GET /api/cap-tables/:id/export
 * @desc    Export cap table to Carta format
 * @access  Private (Founder/Admin)
 */
router.get('/:id/export', capTableController.exportToCartaFormat.bind(capTableController));

/**
 * @route   POST /api/cap-tables/:id/events
 * @desc    Record cap table event
 * @access  Private (Founder/Admin)
 */
router.post('/:id/events', capTableController.recordEvent.bind(capTableController));

export default router;
