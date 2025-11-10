import express from 'express';
import { convertibleNoteController } from '../controllers/convertible-note.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/notes
 * @desc    Create a new convertible note
 * @access  Private (Investor/Founder)
 */
router.post('/', convertibleNoteController.createNote.bind(convertibleNoteController));

/**
 * @route   GET /api/notes/:id
 * @desc    Get convertible note by ID
 * @access  Private (Owner/Admin)
 */
router.get('/:id', convertibleNoteController.getNote.bind(convertibleNoteController));

/**
 * @route   GET /api/notes/startup/:startupId
 * @desc    Get all convertible notes for a startup
 * @access  Private (Founder/Admin)
 */
router.get('/startup/:startupId', convertibleNoteController.getNotesByStartup.bind(convertibleNoteController));

/**
 * @route   GET /api/notes/investor/:investorId
 * @desc    Get all convertible notes for an investor
 * @access  Private (Investor/Admin)
 */
router.get('/investor/:investorId', convertibleNoteController.getNotesByInvestor.bind(convertibleNoteController));

/**
 * @route   GET /api/notes/maturing
 * @desc    Get all notes maturing within 30 days
 * @access  Private (Admin only)
 */
router.get('/maturing', convertibleNoteController.getMaturingNotes.bind(convertibleNoteController));

/**
 * @route   POST /api/notes/:id/accrue
 * @desc    Accrue interest on note (updates database)
 * @access  Private (Founder/Admin)
 */
router.post('/:id/accrue', convertibleNoteController.accrueInterest.bind(convertibleNoteController));

/**
 * @route   GET /api/notes/:id/interest
 * @desc    Calculate accrued interest (read-only)
 * @access  Private
 */
router.get('/:id/interest', convertibleNoteController.calculateInterest.bind(convertibleNoteController));

/**
 * @route   POST /api/notes/:id/convert
 * @desc    Convert note to equity
 * @access  Private (Founder/Admin)
 */
router.post('/:id/convert', convertibleNoteController.convertNote.bind(convertibleNoteController));

/**
 * @route   POST /api/notes/:id/repay
 * @desc    Repay note at maturity
 * @access  Private (Founder/Admin)
 */
router.post('/:id/repay', convertibleNoteController.repayNote.bind(convertibleNoteController));

/**
 * @route   POST /api/notes/:id/calculate-conversion
 * @desc    Calculate conversion price and shares
 * @access  Private
 */
router.post('/:id/calculate-conversion', convertibleNoteController.calculateConversion.bind(convertibleNoteController));

/**
 * @route   POST /api/notes/:id/check-qualified-financing
 * @desc    Check if a round amount qualifies for conversion
 * @access  Private
 */
router.post('/:id/check-qualified-financing', convertibleNoteController.checkQualifiedFinancing.bind(convertibleNoteController));

export default router;
