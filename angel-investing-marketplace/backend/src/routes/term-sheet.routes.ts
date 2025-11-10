import express from 'express';
import { termSheetController } from '../controllers/term-sheet.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/term-sheets
 * @desc    Create a new term sheet
 * @access  Private (Investor/Admin)
 */
router.post('/', termSheetController.createTermSheet.bind(termSheetController));

/**
 * @route   GET /api/term-sheets/:id
 * @desc    Get term sheet by ID
 * @access  Private
 */
router.get('/:id', termSheetController.getTermSheet.bind(termSheetController));

/**
 * @route   GET /api/term-sheets/round/:roundId
 * @desc    Get term sheets by equity round
 * @access  Private
 */
router.get('/round/:roundId', termSheetController.getTermSheetsByRound.bind(termSheetController));

/**
 * @route   GET /api/term-sheets/investor/:investorId
 * @desc    Get term sheets by investor
 * @access  Private (Investor/Admin)
 */
router.get('/investor/:investorId', termSheetController.getTermSheetsByInvestor.bind(termSheetController));

/**
 * @route   PUT /api/term-sheets/:id
 * @desc    Update term sheet
 * @access  Private (Investor/Founder/Admin)
 */
router.put('/:id', termSheetController.updateTermSheet.bind(termSheetController));

/**
 * @route   POST /api/term-sheets/:id/propose
 * @desc    Propose term sheet
 * @access  Private (Investor/Admin)
 */
router.post('/:id/propose', termSheetController.proposeTermSheet.bind(termSheetController));

/**
 * @route   POST /api/term-sheets/:id/accept
 * @desc    Accept term sheet
 * @access  Private (Founder/Admin)
 */
router.post('/:id/accept', termSheetController.acceptTermSheet.bind(termSheetController));

/**
 * @route   POST /api/term-sheets/:id/reject
 * @desc    Reject term sheet
 * @access  Private (Investor/Founder/Admin)
 */
router.post('/:id/reject', termSheetController.rejectTermSheet.bind(termSheetController));

/**
 * @route   POST /api/term-sheets/:id/version
 * @desc    Create new version of term sheet
 * @access  Private (Investor/Founder/Admin)
 */
router.post('/:id/version', termSheetController.createNewVersion.bind(termSheetController));

export default router;
