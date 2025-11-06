import { Router } from 'express';
import { taxController } from '../controllers/tax.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== TAX CALCULATION ENDPOINTS ====================

/**
 * Get comprehensive tax summary for a tax year
 */
router.get('/summary/:taxYear', taxController.getTaxSummary.bind(taxController));

/**
 * Get cost basis for a specific investment
 */
router.get('/cost-basis/:investmentId', taxController.getCostBasis.bind(taxController));

/**
 * Calculate capital gains for a potential sale
 * Body: { saleProceeds: number, saleDate: string }
 */
router.post(
  '/capital-gains/:investmentId',
  taxController.getCapitalGains.bind(taxController)
);

/**
 * Get dividend income for a tax year
 */
router.get('/dividends/:taxYear', taxController.getDividendIncome.bind(taxController));

/**
 * Get partnership income (K-1) for a tax year
 */
router.get(
  '/partnership/:taxYear',
  taxController.getPartnershipIncome.bind(taxController)
);

/**
 * Get Form 8949 transactions for a tax year
 */
router.get(
  '/form8949/:taxYear',
  taxController.getForm8949Transactions.bind(taxController)
);

/**
 * Get available tax years with investment activity
 */
router.get('/years', taxController.getAvailableTaxYears.bind(taxController));

// ==================== PDF DOWNLOAD ENDPOINTS ====================

/**
 * Download K-1 form PDF for a specific syndicate
 */
router.get(
  '/download/k1/:taxYear/:syndicateId',
  taxController.downloadK1Form.bind(taxController)
);

/**
 * Download 1099-DIV form PDF
 */
router.get(
  '/download/1099-div/:taxYear',
  taxController.download1099DivForm.bind(taxController)
);

/**
 * Download 1099-B form PDF
 */
router.get(
  '/download/1099-b/:taxYear',
  taxController.download1099BForm.bind(taxController)
);

/**
 * Download Form 8949 PDF
 */
router.get(
  '/download/form8949/:taxYear',
  taxController.downloadForm8949.bind(taxController)
);

/**
 * Download comprehensive tax summary PDF
 */
router.get(
  '/download/summary/:taxYear',
  taxController.downloadTaxSummary.bind(taxController)
);

/**
 * Download all tax documents as ZIP archive
 */
router.get(
  '/download/all/:taxYear',
  taxController.downloadAllDocuments.bind(taxController)
);

export default router;
