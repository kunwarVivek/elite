import express from 'express';
import { investorRightsController } from '../controllers/investor-rights.controller.js';
import { authenticate } from '../middleware/auth.js';
import { featureGate } from '../middleware/feature-gate.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/investor-rights
 * @desc    Create investor rights
 * @access  Private (Founder/Admin) - Requires Pro tier or higher
 */
router.post(
  '/',
  featureGate('capTableManagement'),
  investorRightsController.createInvestorRights.bind(investorRightsController)
);

/**
 * @route   GET /api/investor-rights/:id
 * @desc    Get investor rights by ID
 * @access  Private
 */
router.get('/:id', investorRightsController.getInvestorRights.bind(investorRightsController));

/**
 * @route   GET /api/investor-rights/investment/:investmentId
 * @desc    Get investor rights by investment
 * @access  Private
 */
router.get('/investment/:investmentId', investorRightsController.getInvestorRightsByInvestment.bind(investorRightsController));

/**
 * @route   GET /api/investor-rights/investor/:investorId
 * @desc    Get investor rights by investor
 * @access  Private (Investor/Admin)
 */
router.get('/investor/:investorId', investorRightsController.getInvestorRightsByInvestor.bind(investorRightsController));

/**
 * @route   GET /api/investor-rights/startup/:startupId
 * @desc    Get investor rights by startup
 * @access  Private (Founder/Admin)
 */
router.get('/startup/:startupId', investorRightsController.getInvestorRightsByStartup.bind(investorRightsController));

/**
 * @route   GET /api/investor-rights/investor/:investorId/summary
 * @desc    Get rights summary for investor
 * @access  Private (Investor/Admin)
 */
router.get('/investor/:investorId/summary', investorRightsController.getRightsSummary.bind(investorRightsController));

/**
 * @route   PUT /api/investor-rights/:id
 * @desc    Update investor rights
 * @access  Private (Founder/Admin)
 */
router.put('/:id', investorRightsController.updateInvestorRights.bind(investorRightsController));

/**
 * @route   POST /api/investor-rights/:id/exercise-pro-rata
 * @desc    Exercise pro-rata right
 * @access  Private (Investor/Admin) - Requires Pro tier or higher
 */
router.post(
  '/:id/exercise-pro-rata',
  featureGate('capTableManagement'),
  investorRightsController.exerciseProRataRight.bind(investorRightsController)
);

/**
 * @route   POST /api/investor-rights/:id/waive
 * @desc    Waive investor right
 * @access  Private (Investor/Admin)
 */
router.post('/:id/waive', investorRightsController.waiveRight.bind(investorRightsController));

/**
 * @route   GET /api/investor-rights/:id/check/:rightType
 * @desc    Check if investor has specific right
 * @access  Private
 */
router.get('/:id/check/:rightType', investorRightsController.checkRight.bind(investorRightsController));

export default router;
