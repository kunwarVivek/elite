import { Request, Response, NextFunction } from 'express';
import { taxCalculationService } from '../services/tax-calculation.service.js';
import { taxPdfService } from '../services/tax-pdf.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { logger } from '../config/logger.js';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

/**
 * Tax Document Controller
 * Handles all tax-related endpoints for document generation and download
 */
export class TaxController {
  /**
   * Get tax summary for a tax year
   * GET /api/tax/summary/:taxYear
   */
  async getTaxSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const taxYear = parseInt(req.params.taxYear);
      if (isNaN(taxYear) || taxYear < 2020 || taxYear > new Date().getFullYear()) {
        throw new AppError('Invalid tax year', 400, 'INVALID_TAX_YEAR');
      }

      const summary = await taxCalculationService.generateTaxSummary(userId, taxYear);

      sendSuccess(res, summary, 'Tax summary retrieved successfully');

      logger.info('Tax summary retrieved', { userId, taxYear });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get cost basis for an investment
   * GET /api/tax/cost-basis/:investmentId
   */
  async getCostBasis(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { investmentId } = req.params;

      // Verify user owns this investment
      const investment = await prisma.investment.findUnique({
        where: { id: investmentId },
      });

      if (!investment) {
        throw new AppError('Investment not found', 404, 'INVESTMENT_NOT_FOUND');
      }

      if (investment.investorId !== userId) {
        throw new AppError('Unauthorized access to investment', 403, 'FORBIDDEN');
      }

      const costBasis = await taxCalculationService.calculateCostBasis(investmentId);

      sendSuccess(res, costBasis, 'Cost basis calculated successfully');

      logger.info('Cost basis retrieved', { userId, investmentId });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get capital gains for an investment sale
   * POST /api/tax/capital-gains/:investmentId
   */
  async getCapitalGains(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { investmentId } = req.params;
      const { saleProceeds, saleDate } = req.body;

      if (!saleProceeds || !saleDate) {
        throw new AppError(
          'Sale proceeds and date are required',
          400,
          'MISSING_REQUIRED_FIELDS'
        );
      }

      // Verify user owns this investment
      const investment = await prisma.investment.findUnique({
        where: { id: investmentId },
      });

      if (!investment) {
        throw new AppError('Investment not found', 404, 'INVESTMENT_NOT_FOUND');
      }

      if (investment.investorId !== userId) {
        throw new AppError('Unauthorized access to investment', 403, 'FORBIDDEN');
      }

      const capitalGains = await taxCalculationService.calculateCapitalGains(
        investmentId,
        Number(saleProceeds),
        new Date(saleDate)
      );

      sendSuccess(res, capitalGains, 'Capital gains calculated successfully');

      logger.info('Capital gains calculated', { userId, investmentId });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get dividend income for a tax year
   * GET /api/tax/dividends/:taxYear
   */
  async getDividendIncome(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const taxYear = parseInt(req.params.taxYear);
      if (isNaN(taxYear) || taxYear < 2020 || taxYear > new Date().getFullYear()) {
        throw new AppError('Invalid tax year', 400, 'INVALID_TAX_YEAR');
      }

      const dividends = await taxCalculationService.calculateDividendIncome(
        userId,
        taxYear
      );

      const totalDividends = dividends.reduce((sum, d) => sum + d.totalDividends, 0);
      const qualifiedDividends = dividends.reduce(
        (sum, d) => sum + d.qualifiedDividends,
        0
      );

      sendSuccess(
        res,
        {
          taxYear,
          dividends,
          summary: {
            totalDividends,
            qualifiedDividends,
            ordinaryDividends: totalDividends - qualifiedDividends,
          },
        },
        'Dividend income retrieved successfully'
      );

      logger.info('Dividend income retrieved', { userId, taxYear });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get partnership income (K-1) for a tax year
   * GET /api/tax/partnership/:taxYear
   */
  async getPartnershipIncome(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const taxYear = parseInt(req.params.taxYear);
      if (isNaN(taxYear) || taxYear < 2020 || taxYear > new Date().getFullYear()) {
        throw new AppError('Invalid tax year', 400, 'INVALID_TAX_YEAR');
      }

      const partnerships = await taxCalculationService.calculatePartnershipIncome(
        userId,
        taxYear
      );

      const totalIncome = partnerships.reduce(
        (sum, p) => sum + p.ordinaryIncome + p.capitalGains,
        0
      );
      const totalDistributions = partnerships.reduce((sum, p) => sum + p.distributions, 0);

      sendSuccess(
        res,
        {
          taxYear,
          partnerships,
          summary: {
            totalIncome,
            totalDistributions,
          },
        },
        'Partnership income retrieved successfully'
      );

      logger.info('Partnership income retrieved', { userId, taxYear });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Form 8949 transactions for a tax year
   * GET /api/tax/form8949/:taxYear
   */
  async getForm8949Transactions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const taxYear = parseInt(req.params.taxYear);
      if (isNaN(taxYear) || taxYear < 2020 || taxYear > new Date().getFullYear()) {
        throw new AppError('Invalid tax year', 400, 'INVALID_TAX_YEAR');
      }

      const transactions = await taxCalculationService.getForm8949Transactions(
        userId,
        taxYear
      );

      const shortTerm = transactions.filter((t) => t.gainType === 'SHORT_TERM');
      const longTerm = transactions.filter((t) => t.gainType === 'LONG_TERM');

      const totalShortTermGain = shortTerm.reduce((sum, t) => sum + t.gain, 0);
      const totalLongTermGain = longTerm.reduce((sum, t) => sum + t.gain, 0);

      sendSuccess(
        res,
        {
          taxYear,
          transactions,
          summary: {
            shortTermCount: shortTerm.length,
            longTermCount: longTerm.length,
            totalShortTermGain,
            totalLongTermGain,
            totalGain: totalShortTermGain + totalLongTermGain,
          },
        },
        'Form 8949 transactions retrieved successfully'
      );

      logger.info('Form 8949 transactions retrieved', { userId, taxYear });
    } catch (error) {
      next(error);
    }
  }

  // ==================== PDF DOWNLOAD ENDPOINTS ====================

  /**
   * Download K-1 form PDF
   * GET /api/tax/download/k1/:taxYear/:syndicateId
   */
  async downloadK1Form(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const taxYear = parseInt(req.params.taxYear);
      const { syndicateId } = req.params;

      if (isNaN(taxYear) || taxYear < 2020 || taxYear > new Date().getFullYear()) {
        throw new AppError('Invalid tax year', 400, 'INVALID_TAX_YEAR');
      }

      // Generate PDF
      const pdf = await taxPdfService.generateK1Form(userId, taxYear, syndicateId);

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="K-1_${taxYear}_${syndicateId.substring(0, 8)}.pdf"`
      );
      res.setHeader('Content-Length', pdf.length);

      // Send PDF
      res.send(pdf);

      logger.info('K-1 form downloaded', { userId, taxYear, syndicateId });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download 1099-DIV form PDF
   * GET /api/tax/download/1099-div/:taxYear
   */
  async download1099DivForm(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const taxYear = parseInt(req.params.taxYear);

      if (isNaN(taxYear) || taxYear < 2020 || taxYear > new Date().getFullYear()) {
        throw new AppError('Invalid tax year', 400, 'INVALID_TAX_YEAR');
      }

      // Generate PDF
      const pdf = await taxPdfService.generate1099DivForm(userId, taxYear);

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="1099-DIV_${taxYear}.pdf"`
      );
      res.setHeader('Content-Length', pdf.length);

      // Send PDF
      res.send(pdf);

      logger.info('1099-DIV form downloaded', { userId, taxYear });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download 1099-B form PDF
   * GET /api/tax/download/1099-b/:taxYear
   */
  async download1099BForm(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const taxYear = parseInt(req.params.taxYear);

      if (isNaN(taxYear) || taxYear < 2020 || taxYear > new Date().getFullYear()) {
        throw new AppError('Invalid tax year', 400, 'INVALID_TAX_YEAR');
      }

      // Generate PDF
      const pdf = await taxPdfService.generate1099BForm(userId, taxYear);

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="1099-B_${taxYear}.pdf"`
      );
      res.setHeader('Content-Length', pdf.length);

      // Send PDF
      res.send(pdf);

      logger.info('1099-B form downloaded', { userId, taxYear });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download Form 8949 PDF
   * GET /api/tax/download/form8949/:taxYear
   */
  async downloadForm8949(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const taxYear = parseInt(req.params.taxYear);

      if (isNaN(taxYear) || taxYear < 2020 || taxYear > new Date().getFullYear()) {
        throw new AppError('Invalid tax year', 400, 'INVALID_TAX_YEAR');
      }

      // Generate PDF
      const pdf = await taxPdfService.generateForm8949(userId, taxYear);

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Form8949_${taxYear}.pdf"`
      );
      res.setHeader('Content-Length', pdf.length);

      // Send PDF
      res.send(pdf);

      logger.info('Form 8949 downloaded', { userId, taxYear });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download tax summary PDF
   * GET /api/tax/download/summary/:taxYear
   */
  async downloadTaxSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const taxYear = parseInt(req.params.taxYear);

      if (isNaN(taxYear) || taxYear < 2020 || taxYear > new Date().getFullYear()) {
        throw new AppError('Invalid tax year', 400, 'INVALID_TAX_YEAR');
      }

      // Generate PDF
      const pdf = await taxPdfService.generateTaxSummary(userId, taxYear);

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Tax_Summary_${taxYear}.pdf"`
      );
      res.setHeader('Content-Length', pdf.length);

      // Send PDF
      res.send(pdf);

      logger.info('Tax summary downloaded', { userId, taxYear });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download all tax documents as ZIP
   * GET /api/tax/download/all/:taxYear
   */
  async downloadAllDocuments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const taxYear = parseInt(req.params.taxYear);

      if (isNaN(taxYear) || taxYear < 2020 || taxYear > new Date().getFullYear()) {
        throw new AppError('Invalid tax year', 400, 'INVALID_TAX_YEAR');
      }

      // Generate all tax documents
      const documents = await taxPdfService.generateAllTaxDocuments(userId, taxYear);

      // Create ZIP archive
      const archiver = await import('archiver');
      const archive = archiver.default('zip', { zlib: { level: 9 } });

      // Set headers for ZIP download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Tax_Documents_${taxYear}.zip"`
      );

      // Pipe archive to response
      archive.pipe(res);

      // Add each document to the archive
      for (const [name, pdf] of Object.entries(documents)) {
        archive.append(pdf, { name: `${name}_${taxYear}.pdf` });
      }

      // Finalize the archive
      await archive.finalize();

      logger.info('All tax documents downloaded as ZIP', { userId, taxYear });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available tax years for user
   * GET /api/tax/years
   */
  async getAvailableTaxYears(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      // Get years with investment activity
      const investments = await prisma.investment.findMany({
        where: {
          investorId: userId,
          status: 'COMPLETED',
        },
        select: {
          completedAt: true,
          investmentDate: true,
        },
      });

      const years = new Set<number>();
      investments.forEach((inv) => {
        const date = inv.completedAt || inv.investmentDate || new Date();
        years.add(date.getFullYear());
      });

      // Sort years in descending order
      const sortedYears = Array.from(years).sort((a, b) => b - a);

      sendSuccess(
        res,
        {
          years: sortedYears,
          currentYear: new Date().getFullYear(),
        },
        'Available tax years retrieved successfully'
      );

      logger.info('Available tax years retrieved', { userId, yearCount: sortedYears.length });
    } catch (error) {
      next(error);
    }
  }
}

// Add prisma import
import { prisma } from '../config/database.js';

// Export singleton instance
export const taxController = new TaxController();
