import express from 'express';
import { safeController } from '../controllers/safe.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/safes
 * @desc    Create a new SAFE agreement
 * @access  Private (Investor/Founder)
 */
router.post('/', safeController.createSafe.bind(safeController));

/**
 * @route   GET /api/safes/:id
 * @desc    Get SAFE by ID
 * @access  Private (Owner/Admin)
 */
router.get('/:id', safeController.getSafe.bind(safeController));

/**
 * @route   PUT /api/safes/:id
 * @desc    Update SAFE terms
 * @access  Private (Founder/Admin)
 */
router.put('/:id', safeController.updateSafe.bind(safeController));

/**
 * @route   GET /api/safes/startup/:startupId
 * @desc    Get all SAFEs for a startup
 * @access  Private (Founder/Admin)
 */
router.get('/startup/:startupId', safeController.getSafesByStartup.bind(safeController));

/**
 * @route   GET /api/safes/investor/:investorId
 * @desc    Get all SAFEs for an investor
 * @access  Private (Investor/Admin)
 */
router.get('/investor/:investorId', safeController.getSafesByInvestor.bind(safeController));

/**
 * @route   POST /api/safes/:id/convert
 * @desc    Convert SAFE to equity
 * @access  Private (Founder/Admin)
 */
router.post('/:id/convert', safeController.convertSafe.bind(safeController));

/**
 * @route   POST /api/safes/:id/calculate-conversion
 * @desc    Calculate conversion price and shares
 * @access  Private
 */
router.post('/:id/calculate-conversion', safeController.calculateConversion.bind(safeController));

/**
 * @route   POST /api/safes/:id/dissolve
 * @desc    Dissolve/cancel SAFE
 * @access  Private (Founder/Admin)
 */
router.post('/:id/dissolve', safeController.dissolveSafe.bind(safeController));

/**
 * @route   GET /api/safes/startup/:startupId/triggers
 * @desc    Check conversion triggers for a startup
 * @access  Private (Founder/Admin)
 */
router.get('/startup/:startupId/triggers', safeController.checkConversionTriggers.bind(safeController));

export default router;
