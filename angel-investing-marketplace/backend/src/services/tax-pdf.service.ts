import puppeteer from 'puppeteer';
import { logger } from '../config/logger.js';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { taxCalculationService, TaxSummary } from './tax-calculation.service.js';
import type {
  CapitalGainCalculation,
  DividendIncomeCalculation,
  PartnershipIncomeCalculation,
} from './tax-calculation.service.js';

/**
 * Tax PDF Generation Service
 * Generates IRS-compliant tax forms as PDFs
 * - K-1 (Partnership Income)
 * - 1099-DIV (Dividend Income)
 * - 1099-B (Broker Transactions)
 * - Form 8949 (Sales and Dispositions)
 * - Comprehensive Tax Summary
 */

export interface TaxDocumentMetadata {
  documentId: string;
  userId: string;
  taxYear: number;
  formType: 'K1' | '1099_DIV' | '1099_B' | 'FORM_8949' | 'TAX_SUMMARY';
  generatedAt: Date;
  fileSize: number;
  fileName: string;
}

export class TaxPdfService {
  private browser: puppeteer.Browser | null = null;

  /**
   * Initialize browser instance
   */
  private async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browser;
  }

  /**
   * Close browser instance
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Generate K-1 form (Partnership Income)
   */
  async generateK1Form(
    userId: string,
    taxYear: number,
    syndicateId: string
  ): Promise<Buffer> {
    try {
      logger.info('Generating K-1 form', { userId, taxYear, syndicateId });

      // Get partnership income data
      const partnerships = await taxCalculationService.calculatePartnershipIncome(
        userId,
        taxYear
      );
      const partnershipData = partnerships.find((p) => p.syndicateId === syndicateId);

      if (!partnershipData) {
        throw new AppError(
          'Partnership income data not found',
          404,
          'PARTNERSHIP_NOT_FOUND'
        );
      }

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          complianceProfile: true,
        },
      });

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Get syndicate details
      const syndicate = await prisma.syndicate.findUnique({
        where: { id: syndicateId },
        include: {
          spvs: true,
        },
      });

      if (!syndicate) {
        throw new AppError('Syndicate not found', 404, 'SYNDICATE_NOT_FOUND');
      }

      const spv = syndicate.spvs[0];

      // Generate HTML template
      const html = this.generateK1Html({
        taxYear,
        partnershipName: syndicate.name,
        partnershipEIN: spv?.taxId || 'XX-XXXXXXX',
        partnerName: user.name || `${user.email}`,
        partnerSSN: user.complianceProfile?.taxId || 'XXX-XX-XXXX',
        partnerAddress:
          user.complianceProfile?.address || { street: '', city: '', state: '', postalCode: '' },
        ordinaryIncome: partnershipData.ordinaryIncome,
        capitalGains: partnershipData.capitalGains,
        distributions: partnershipData.distributions,
        investorShare: partnershipData.investorShare,
      });

      // Generate PDF
      const pdf = await this.htmlToPdf(html, 'K-1 Form');

      logger.info('K-1 form generated successfully', { userId, taxYear, syndicateId });
      return pdf;
    } catch (error) {
      logger.error('Failed to generate K-1 form', { error, userId, taxYear });
      throw error;
    }
  }

  /**
   * Generate 1099-DIV form (Dividend Income)
   */
  async generate1099DivForm(userId: string, taxYear: number): Promise<Buffer> {
    try {
      logger.info('Generating 1099-DIV form', { userId, taxYear });

      // Get dividend income data
      const dividends = await taxCalculationService.calculateDividendIncome(
        userId,
        taxYear
      );

      if (dividends.length === 0) {
        throw new AppError(
          'No dividend income for tax year',
          404,
          'NO_DIVIDEND_INCOME'
        );
      }

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          complianceProfile: true,
        },
      });

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Aggregate all dividends
      const totalDividends = dividends.reduce((sum, d) => sum + d.totalDividends, 0);
      const qualifiedDividends = dividends.reduce(
        (sum, d) => sum + d.qualifiedDividends,
        0
      );
      const ordinaryDividends = dividends.reduce(
        (sum, d) => sum + d.ordinaryDividends,
        0
      );

      // Generate HTML template
      const html = this.generate1099DivHtml({
        taxYear,
        payerName: 'Elite Angel Investing Marketplace',
        payerEIN: '12-3456789', // Platform EIN
        payerAddress: {
          street: '123 Market St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94102',
        },
        recipientName: user.name || user.email,
        recipientSSN: user.complianceProfile?.taxId || 'XXX-XX-XXXX',
        recipientAddress:
          user.complianceProfile?.address || { street: '', city: '', state: '', postalCode: '' },
        totalDividends,
        qualifiedDividends,
        ordinaryDividends,
      });

      // Generate PDF
      const pdf = await this.htmlToPdf(html, '1099-DIV Form');

      logger.info('1099-DIV form generated successfully', { userId, taxYear });
      return pdf;
    } catch (error) {
      logger.error('Failed to generate 1099-DIV form', { error, userId, taxYear });
      throw error;
    }
  }

  /**
   * Generate 1099-B form (Broker Transactions)
   */
  async generate1099BForm(userId: string, taxYear: number): Promise<Buffer> {
    try {
      logger.info('Generating 1099-B form', { userId, taxYear });

      // Get Form 8949 transactions (sales)
      const transactions = await taxCalculationService.getForm8949Transactions(
        userId,
        taxYear
      );

      if (transactions.length === 0) {
        throw new AppError(
          'No broker transactions for tax year',
          404,
          'NO_BROKER_TRANSACTIONS'
        );
      }

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          complianceProfile: true,
        },
      });

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Generate HTML template
      const html = this.generate1099BHtml({
        taxYear,
        payerName: 'Elite Angel Investing Marketplace',
        payerEIN: '12-3456789',
        payerAddress: {
          street: '123 Market St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94102',
        },
        recipientName: user.name || user.email,
        recipientSSN: user.complianceProfile?.taxId || 'XXX-XX-XXXX',
        recipientAddress:
          user.complianceProfile?.address || { street: '', city: '', state: '', postalCode: '' },
        transactions: transactions.map((t) => ({
          description: t.description,
          dateAcquired: t.dateAcquired,
          dateSold: t.dateSold,
          proceeds: t.proceeds,
          costBasis: t.costBasis,
          washSaleAdjustment: 0,
        })),
      });

      // Generate PDF
      const pdf = await this.htmlToPdf(html, '1099-B Form');

      logger.info('1099-B form generated successfully', { userId, taxYear });
      return pdf;
    } catch (error) {
      logger.error('Failed to generate 1099-B form', { error, userId, taxYear });
      throw error;
    }
  }

  /**
   * Generate Form 8949 (Sales and Dispositions)
   */
  async generateForm8949(userId: string, taxYear: number): Promise<Buffer> {
    try {
      logger.info('Generating Form 8949', { userId, taxYear });

      // Get Form 8949 transactions
      const transactions = await taxCalculationService.getForm8949Transactions(
        userId,
        taxYear
      );

      if (transactions.length === 0) {
        throw new AppError(
          'No sales for tax year',
          404,
          'NO_SALES_TRANSACTIONS'
        );
      }

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          complianceProfile: true,
        },
      });

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Separate short-term and long-term transactions
      const shortTerm = transactions.filter((t) => t.gainType === 'SHORT_TERM');
      const longTerm = transactions.filter((t) => t.gainType === 'LONG_TERM');

      // Generate HTML template
      const html = this.generateForm8949Html({
        taxYear,
        taxpayerName: user.name || user.email,
        taxpayerSSN: user.complianceProfile?.taxId || 'XXX-XX-XXXX',
        shortTermTransactions: shortTerm,
        longTermTransactions: longTerm,
      });

      // Generate PDF
      const pdf = await this.htmlToPdf(html, 'Form 8949');

      logger.info('Form 8949 generated successfully', { userId, taxYear });
      return pdf;
    } catch (error) {
      logger.error('Failed to generate Form 8949', { error, userId, taxYear });
      throw error;
    }
  }

  /**
   * Generate comprehensive tax summary
   */
  async generateTaxSummary(userId: string, taxYear: number): Promise<Buffer> {
    try {
      logger.info('Generating tax summary', { userId, taxYear });

      // Get comprehensive tax data
      const summary = await taxCalculationService.generateTaxSummary(userId, taxYear);

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          complianceProfile: true,
        },
      });

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Generate HTML template
      const html = this.generateTaxSummaryHtml({
        taxYear,
        userName: user.name || user.email,
        userEmail: user.email,
        summary,
      });

      // Generate PDF
      const pdf = await this.htmlToPdf(html, 'Tax Summary');

      logger.info('Tax summary generated successfully', { userId, taxYear });
      return pdf;
    } catch (error) {
      logger.error('Failed to generate tax summary', { error, userId, taxYear });
      throw error;
    }
  }

  /**
   * Generate all tax documents for a user
   */
  async generateAllTaxDocuments(
    userId: string,
    taxYear: number
  ): Promise<Record<string, Buffer>> {
    try {
      logger.info('Generating all tax documents', { userId, taxYear });

      const documents: Record<string, Buffer> = {};

      // Generate tax summary (always)
      try {
        documents.taxSummary = await this.generateTaxSummary(userId, taxYear);
      } catch (error) {
        logger.warn('Failed to generate tax summary', { error, userId, taxYear });
      }

      // Generate 1099-DIV if dividends exist
      try {
        const dividends = await taxCalculationService.calculateDividendIncome(
          userId,
          taxYear
        );
        if (dividends.length > 0) {
          documents['1099_div'] = await this.generate1099DivForm(userId, taxYear);
        }
      } catch (error) {
        logger.warn('No dividend income for 1099-DIV', { userId, taxYear });
      }

      // Generate 1099-B and Form 8949 if sales exist
      try {
        const transactions = await taxCalculationService.getForm8949Transactions(
          userId,
          taxYear
        );
        if (transactions.length > 0) {
          documents['1099_b'] = await this.generate1099BForm(userId, taxYear);
          documents.form8949 = await this.generateForm8949(userId, taxYear);
        }
      } catch (error) {
        logger.warn('No broker transactions for 1099-B/8949', { userId, taxYear });
      }

      // Generate K-1 for each syndicate investment
      try {
        const partnerships = await taxCalculationService.calculatePartnershipIncome(
          userId,
          taxYear
        );
        for (const partnership of partnerships) {
          documents[`k1_${partnership.syndicateId}`] = await this.generateK1Form(
            userId,
            taxYear,
            partnership.syndicateId
          );
        }
      } catch (error) {
        logger.warn('No partnership income for K-1', { userId, taxYear });
      }

      logger.info('All tax documents generated', {
        userId,
        taxYear,
        documentCount: Object.keys(documents).length,
      });

      return documents;
    } catch (error) {
      logger.error('Failed to generate all tax documents', { error, userId, taxYear });
      throw error;
    }
  }

  /**
   * Convert HTML to PDF
   */
  private async htmlToPdf(html: string, title: string): Promise<Buffer> {
    try {
      const browser = await this.initBrowser();
      const page = await browser.newPage();

      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'LETTER',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in',
        },
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; color: #666;">
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        `,
      });

      await page.close();

      return Buffer.from(pdf);
    } catch (error) {
      logger.error('Failed to convert HTML to PDF', { error, title });
      throw new AppError('Failed to generate PDF', 500, 'PDF_GENERATION_FAILED');
    }
  }

  // ==================== HTML TEMPLATES ====================

  /**
   * Generate K-1 HTML template
   */
  private generateK1Html(data: {
    taxYear: number;
    partnershipName: string;
    partnershipEIN: string;
    partnerName: string;
    partnerSSN: string;
    partnerAddress: any;
    ordinaryIncome: number;
    capitalGains: number;
    distributions: number;
    investorShare: number;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Schedule K-1 (Form 1065) - Tax Year ${data.taxYear}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; font-weight: bold; }
          .form-title { font-size: 16px; margin-bottom: 10px; }
          .section { margin-bottom: 20px; border: 1px solid #000; padding: 10px; }
          .section-title { font-weight: bold; margin-bottom: 10px; background: #f0f0f0; padding: 5px; }
          .field { margin: 5px 0; display: flex; }
          .field-label { width: 300px; }
          .field-value { flex: 1; border-bottom: 1px solid #000; padding-left: 10px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .amount { text-align: right; font-family: monospace; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          table th, table td { border: 1px solid #000; padding: 8px; text-align: left; }
          table th { background: #f0f0f0; font-weight: bold; }
          .footer { margin-top: 30px; font-size: 10px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="form-title">Schedule K-1 (Form 1065)</div>
          <div>Partner's Share of Income, Deductions, Credits, etc.</div>
          <div>For calendar year ${data.taxYear}</div>
        </div>

        <div class="section">
          <div class="section-title">Part I - Information About the Partnership</div>
          <div class="field">
            <span class="field-label">A. Partnership's name</span>
            <span class="field-value">${data.partnershipName}</span>
          </div>
          <div class="field">
            <span class="field-label">B. Partnership's EIN</span>
            <span class="field-value">${data.partnershipEIN}</span>
          </div>
          <div class="field">
            <span class="field-label">C. Partnership's address</span>
            <span class="field-value">123 Market St, San Francisco, CA 94102</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Part II - Information About the Partner</div>
          <div class="field">
            <span class="field-label">E. Partner's name</span>
            <span class="field-value">${data.partnerName}</span>
          </div>
          <div class="field">
            <span class="field-label">F. Partner's SSN or TIN</span>
            <span class="field-value">${data.partnerSSN}</span>
          </div>
          <div class="field">
            <span class="field-label">G. Partner's address</span>
            <span class="field-value">${data.partnerAddress.street}, ${data.partnerAddress.city}, ${data.partnerAddress.state} ${data.partnerAddress.postalCode}</span>
          </div>
          <div class="field">
            <span class="field-label">H. Partner's share of profit, loss, and capital</span>
            <span class="field-value">${((data.investorShare / 1000000) * 100).toFixed(2)}%</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Part III - Partner's Share of Current Year Income, Deductions, Credits, and Other Items</div>
          <table>
            <thead>
              <tr>
                <th style="width: 60px;">Line</th>
                <th>Description</th>
                <th style="width: 150px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>Ordinary business income (loss)</td>
                <td class="amount">$${data.ordinaryIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>2</td>
                <td>Net rental real estate income (loss)</td>
                <td class="amount">$0.00</td>
              </tr>
              <tr>
                <td>3</td>
                <td>Other net rental income (loss)</td>
                <td class="amount">$0.00</td>
              </tr>
              <tr>
                <td>4a</td>
                <td>Guaranteed payments to partner</td>
                <td class="amount">$0.00</td>
              </tr>
              <tr>
                <td>5</td>
                <td>Interest income</td>
                <td class="amount">$0.00</td>
              </tr>
              <tr>
                <td>6</td>
                <td>Dividends</td>
                <td class="amount">$0.00</td>
              </tr>
              <tr>
                <td>7</td>
                <td>Royalties</td>
                <td class="amount">$0.00</td>
              </tr>
              <tr>
                <td>8</td>
                <td>Net short-term capital gain (loss)</td>
                <td class="amount">$0.00</td>
              </tr>
              <tr>
                <td>9a</td>
                <td>Net long-term capital gain (loss)</td>
                <td class="amount">$${data.capitalGains.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>19</td>
                <td>Distributions</td>
                <td class="amount">$${data.distributions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p><strong>Notice:</strong> This is an informational copy of your Schedule K-1. Please consult with a tax professional for proper filing.</p>
          <p>Generated by Elite Angel Investing Marketplace on ${new Date().toLocaleDateString()}</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate 1099-DIV HTML template
   */
  private generate1099DivHtml(data: {
    taxYear: number;
    payerName: string;
    payerEIN: string;
    payerAddress: any;
    recipientName: string;
    recipientSSN: string;
    recipientAddress: any;
    totalDividends: number;
    qualifiedDividends: number;
    ordinaryDividends: number;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Form 1099-DIV - Tax Year ${data.taxYear}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; }
          .form-container { border: 2px solid #000; padding: 15px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 15px; }
          .form-title { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
          .form-number { font-size: 12px; margin-bottom: 5px; }
          .section { margin-bottom: 15px; }
          .section-row { display: flex; margin: 5px 0; }
          .label { font-weight: bold; width: 200px; }
          .value { flex: 1; border-bottom: 1px solid #000; padding-left: 5px; }
          .boxes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 15px; }
          .box { border: 1px solid #000; padding: 10px; }
          .box-number { font-weight: bold; font-size: 10px; margin-bottom: 5px; }
          .box-label { font-size: 9px; margin-bottom: 5px; min-height: 30px; }
          .box-amount { font-size: 14px; font-weight: bold; text-align: right; }
          .instructions { font-size: 9px; margin-top: 15px; color: #666; }
        </style>
      </head>
      <body>
        <div class="form-container">
          <div class="header">
            <div class="form-number">VOID | CORRECTED</div>
            <div class="form-title">DIVIDENDS AND DISTRIBUTIONS</div>
            <div class="form-number">Form 1099-DIV</div>
            <div>(Rev. January ${data.taxYear})</div>
            <div style="margin-top: 5px;">Copy B For Recipient</div>
          </div>

          <div class="section">
            <div class="section-row">
              <span class="label">PAYER'S name</span>
              <span class="value">${data.payerName}</span>
            </div>
            <div class="section-row">
              <span class="label">PAYER'S TIN</span>
              <span class="value">${data.payerEIN}</span>
            </div>
            <div class="section-row">
              <span class="label">PAYER'S address</span>
              <span class="value">${data.payerAddress.street}, ${data.payerAddress.city}, ${data.payerAddress.state} ${data.payerAddress.postalCode}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-row">
              <span class="label">RECIPIENT'S name</span>
              <span class="value">${data.recipientName}</span>
            </div>
            <div class="section-row">
              <span class="label">RECIPIENT'S TIN</span>
              <span class="value">${data.recipientSSN}</span>
            </div>
            <div class="section-row">
              <span class="label">RECIPIENT'S address</span>
              <span class="value">${data.recipientAddress.street}, ${data.recipientAddress.city}, ${data.recipientAddress.state} ${data.recipientAddress.postalCode}</span>
            </div>
          </div>

          <div class="boxes">
            <div class="box">
              <div class="box-number">1a</div>
              <div class="box-label">Total ordinary dividends</div>
              <div class="box-amount">$${data.totalDividends.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div class="box">
              <div class="box-number">1b</div>
              <div class="box-label">Qualified dividends</div>
              <div class="box-amount">$${data.qualifiedDividends.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div class="box">
              <div class="box-number">2a</div>
              <div class="box-label">Total capital gain distributions</div>
              <div class="box-amount">$0.00</div>
            </div>
            <div class="box">
              <div class="box-number">3</div>
              <div class="box-label">Nondividend distributions</div>
              <div class="box-amount">$0.00</div>
            </div>
            <div class="box">
              <div class="box-number">4</div>
              <div class="box-label">Federal income tax withheld</div>
              <div class="box-amount">$0.00</div>
            </div>
            <div class="box">
              <div class="box-number">5</div>
              <div class="box-label">Section 199A dividends</div>
              <div class="box-amount">$0.00</div>
            </div>
          </div>

          <div class="instructions">
            <p><strong>Instructions for Recipient:</strong> Box 1a shows total ordinary dividends. Box 1b shows the portion that may be eligible for reduced capital gains rates. Report these amounts on your tax return as instructed by the IRS.</p>
            <p style="margin-top: 5px;">This is important tax information and is being furnished to the IRS. If you are required to file a return, a negligence penalty or other sanction may be imposed on you if this income is taxable and the IRS determines that it has not been reported.</p>
            <p style="margin-top: 10px;">Generated by Elite Angel Investing Marketplace on ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate 1099-B HTML template
   */
  private generate1099BHtml(data: {
    taxYear: number;
    payerName: string;
    payerEIN: string;
    payerAddress: any;
    recipientName: string;
    recipientSSN: string;
    recipientAddress: any;
    transactions: Array<{
      description: string;
      dateAcquired: Date;
      dateSold: Date;
      proceeds: number;
      costBasis: number;
      washSaleAdjustment: number;
    }>;
  }): string {
    const totalProceeds = data.transactions.reduce((sum, t) => sum + t.proceeds, 0);
    const totalCostBasis = data.transactions.reduce((sum, t) => sum + t.costBasis, 0);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Form 1099-B - Tax Year ${data.taxYear}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 10px; padding: 20px; }
          .form-container { border: 2px solid #000; padding: 15px; max-width: 900px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 15px; }
          .form-title { font-size: 14px; font-weight: bold; }
          .section { margin-bottom: 10px; }
          .section-row { display: flex; margin: 3px 0; }
          .label { font-weight: bold; width: 180px; font-size: 9px; }
          .value { flex: 1; border-bottom: 1px solid #000; padding-left: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9px; }
          table th, table td { border: 1px solid #000; padding: 6px; }
          table th { background: #f0f0f0; font-weight: bold; }
          .amount { text-align: right; font-family: monospace; }
          .instructions { font-size: 8px; margin-top: 10px; color: #666; }
        </style>
      </head>
      <body>
        <div class="form-container">
          <div class="header">
            <div class="form-title">PROCEEDS FROM BROKER AND BARTER EXCHANGE TRANSACTIONS</div>
            <div>Form 1099-B</div>
            <div>(Rev. January ${data.taxYear})</div>
            <div style="margin-top: 5px;">Copy B For Recipient</div>
          </div>

          <div class="section">
            <div class="section-row">
              <span class="label">PAYER'S name</span>
              <span class="value">${data.payerName}</span>
            </div>
            <div class="section-row">
              <span class="label">PAYER'S TIN</span>
              <span class="value">${data.payerEIN}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-row">
              <span class="label">RECIPIENT'S name</span>
              <span class="value">${data.recipientName}</span>
            </div>
            <div class="section-row">
              <span class="label">RECIPIENT'S TIN</span>
              <span class="value">${data.recipientSSN}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description of Property</th>
                <th>Date Acquired</th>
                <th>Date Sold</th>
                <th class="amount">Proceeds</th>
                <th class="amount">Cost Basis</th>
                <th class="amount">Gain/Loss</th>
              </tr>
            </thead>
            <tbody>
              ${data.transactions
                .map(
                  (t) => `
                <tr>
                  <td>${t.description}</td>
                  <td>${new Date(t.dateAcquired).toLocaleDateString()}</td>
                  <td>${new Date(t.dateSold).toLocaleDateString()}</td>
                  <td class="amount">$${t.proceeds.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td class="amount">$${t.costBasis.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td class="amount">$${(t.proceeds - t.costBasis).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              `
                )
                .join('')}
              <tr style="font-weight: bold; background: #f0f0f0;">
                <td colspan="3">TOTAL</td>
                <td class="amount">$${totalProceeds.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="amount">$${totalCostBasis.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="amount">$${(totalProceeds - totalCostBasis).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>

          <div class="instructions">
            <p><strong>Important:</strong> This form reports proceeds from broker transactions. You must report these transactions on Form 8949 and Schedule D of your tax return.</p>
            <p style="margin-top: 5px;">Generated by Elite Angel Investing Marketplace on ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate Form 8949 HTML template
   */
  private generateForm8949Html(data: {
    taxYear: number;
    taxpayerName: string;
    taxpayerSSN: string;
    shortTermTransactions: any[];
    longTermTransactions: any[];
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Form 8949 - Tax Year ${data.taxYear}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 10px; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .form-title { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
          .taxpayer-info { margin-bottom: 15px; }
          .section-title { font-weight: bold; background: #f0f0f0; padding: 5px; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 9px; }
          table th, table td { border: 1px solid #000; padding: 5px; }
          table th { background: #e0e0e0; font-weight: bold; }
          .amount { text-align: right; font-family: monospace; }
          .instructions { font-size: 8px; margin-top: 15px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="form-title">Form 8949</div>
          <div>Sales and Other Dispositions of Capital Assets</div>
          <div>For calendar year ${data.taxYear}</div>
        </div>

        <div class="taxpayer-info">
          <div><strong>Name:</strong> ${data.taxpayerName}</div>
          <div><strong>Social Security Number:</strong> ${data.taxpayerSSN}</div>
        </div>

        ${
          data.shortTermTransactions.length > 0
            ? `
        <div class="section-title">Part I - Short-Term Transactions (held 1 year or less)</div>
        <table>
          <thead>
            <tr>
              <th>(a) Description</th>
              <th>(b) Date Acquired</th>
              <th>(c) Date Sold</th>
              <th>(d) Proceeds</th>
              <th>(e) Cost Basis</th>
              <th>(h) Gain or (Loss)</th>
            </tr>
          </thead>
          <tbody>
            ${data.shortTermTransactions
              .map(
                (t: any) => `
              <tr>
                <td>${t.description}</td>
                <td>${new Date(t.dateAcquired).toLocaleDateString()}</td>
                <td>${new Date(t.dateSold).toLocaleDateString()}</td>
                <td class="amount">$${t.proceeds.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td class="amount">$${t.costBasis.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td class="amount">$${t.gain.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            `
              )
              .join('')}
            <tr style="font-weight: bold; background: #f0f0f0;">
              <td colspan="3">Subtotal</td>
              <td class="amount">$${data.shortTermTransactions.reduce((s: number, t: any) => s + t.proceeds, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td class="amount">$${data.shortTermTransactions.reduce((s: number, t: any) => s + t.costBasis, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td class="amount">$${data.shortTermTransactions.reduce((s: number, t: any) => s + t.gain, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>
        `
            : ''
        }

        ${
          data.longTermTransactions.length > 0
            ? `
        <div class="section-title">Part II - Long-Term Transactions (held more than 1 year)</div>
        <table>
          <thead>
            <tr>
              <th>(a) Description</th>
              <th>(b) Date Acquired</th>
              <th>(c) Date Sold</th>
              <th>(d) Proceeds</th>
              <th>(e) Cost Basis</th>
              <th>(h) Gain or (Loss)</th>
            </tr>
          </thead>
          <tbody>
            ${data.longTermTransactions
              .map(
                (t: any) => `
              <tr>
                <td>${t.description}</td>
                <td>${new Date(t.dateAcquired).toLocaleDateString()}</td>
                <td>${new Date(t.dateSold).toLocaleDateString()}</td>
                <td class="amount">$${t.proceeds.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td class="amount">$${t.costBasis.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td class="amount">$${t.gain.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            `
              )
              .join('')}
            <tr style="font-weight: bold; background: #f0f0f0;">
              <td colspan="3">Subtotal</td>
              <td class="amount">$${data.longTermTransactions.reduce((s: number, t: any) => s + t.proceeds, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td class="amount">$${data.longTermTransactions.reduce((s: number, t: any) => s + t.costBasis, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td class="amount">$${data.longTermTransactions.reduce((s: number, t: any) => s + t.gain, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>
        `
            : ''
        }

        <div class="instructions">
          <p><strong>Instructions:</strong> Complete this form to report sales and exchanges of capital assets. Report short-term gains and losses in Part I and long-term gains and losses in Part II. Transfer the totals to Schedule D.</p>
          <p style="margin-top: 5px;">Generated by Elite Angel Investing Marketplace on ${new Date().toLocaleDateString()}</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate tax summary HTML template
   */
  private generateTaxSummaryHtml(data: {
    taxYear: number;
    userName: string;
    userEmail: string;
    summary: TaxSummary;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Tax Summary ${data.taxYear}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; padding: 30px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { font-size: 24px; margin-bottom: 10px; }
          .header .year { font-size: 18px; color: #666; }
          .user-info { margin-bottom: 30px; padding: 15px; background: #f0f0f0; border-radius: 5px; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 16px; font-weight: bold; margin-bottom: 15px; padding-bottom: 5px; border-bottom: 2px solid #333; }
          .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .summary-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
          .summary-card h3 { font-size: 14px; margin-bottom: 10px; color: #666; }
          .summary-card .value { font-size: 24px; font-weight: bold; color: #333; }
          .detail-table { width: 100%; border-collapse: collapse; }
          .detail-table th, .detail-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          .detail-table th { background: #f0f0f0; font-weight: bold; }
          .detail-table .amount { text-align: right; font-family: monospace; }
          .highlight { background: #fff9e6; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #333; font-size: 10px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Investment Tax Summary</h1>
          <div class="year">Tax Year ${data.taxYear}</div>
        </div>

        <div class="user-info">
          <div><strong>Investor:</strong> ${data.userName}</div>
          <div><strong>Email:</strong> ${data.userEmail}</div>
          <div><strong>Generated:</strong> ${new Date().toLocaleDateString()}</div>
        </div>

        <div class="section">
          <div class="section-title">Investment Overview</div>
          <div class="summary-grid">
            <div class="summary-card">
              <h3>Total Investments</h3>
              <div class="value">${data.summary.totalInvestments}</div>
            </div>
            <div class="summary-card">
              <h3>Total Cost Basis</h3>
              <div class="value">$${data.summary.totalCostBasis.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Income Summary</div>
          <table class="detail-table">
            <thead>
              <tr>
                <th>Income Type</th>
                <th class="amount">Amount</th>
                <th class="amount">Est. Tax Rate</th>
                <th class="amount">Est. Tax</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Short-term Capital Gains</td>
                <td class="amount">$${data.summary.shortTermGains.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td class="amount">24%</td>
                <td class="amount">$${(data.summary.shortTermGains * 0.24).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>Long-term Capital Gains</td>
                <td class="amount">$${data.summary.longTermGains.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td class="amount">15%</td>
                <td class="amount">$${(data.summary.longTermGains * 0.15).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>Qualified Dividends</td>
                <td class="amount">$${data.summary.qualifiedDividends.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td class="amount">15%</td>
                <td class="amount">$${(data.summary.qualifiedDividends * 0.15).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>Ordinary Dividends</td>
                <td class="amount">$${(data.summary.totalDividends - data.summary.qualifiedDividends).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td class="amount">24%</td>
                <td class="amount">$${((data.summary.totalDividends - data.summary.qualifiedDividends) * 0.24).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>Partnership Income (K-1)</td>
                <td class="amount">$${data.summary.partnershipIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td class="amount">24%</td>
                <td class="amount">$${(data.summary.partnershipIncome * 0.24).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr class="highlight" style="font-weight: bold;">
                <td>TOTAL INCOME</td>
                <td class="amount">$${(data.summary.totalCapitalGains + data.summary.totalDividends + data.summary.partnershipIncome).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td class="amount">${data.summary.effectiveTaxRate}%</td>
                <td class="amount">$${data.summary.totalTaxLiability.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">Tax Documents</div>
          <p>The following tax documents have been prepared for your ${data.taxYear} tax filing:</p>
          <ul style="margin-top: 10px; margin-left: 20px;">
            ${data.summary.totalDividends > 0 ? '<li>Form 1099-DIV (Dividend Income)</li>' : ''}
            ${data.summary.totalCapitalGains !== 0 ? '<li>Form 1099-B (Broker Transactions)</li>' : ''}
            ${data.summary.totalCapitalGains !== 0 ? '<li>Form 8949 (Sales and Dispositions)</li>' : ''}
            ${data.summary.partnershipIncome > 0 ? '<li>Schedule K-1 (Partnership Income)</li>' : ''}
          </ul>
        </div>

        <div class="footer">
          <p><strong>Disclaimer:</strong> This tax summary is provided for informational purposes only. Tax rates shown are estimates based on typical rates and may not reflect your actual tax liability. Please consult with a qualified tax professional for accurate tax preparation and filing.</p>
          <p style="margin-top: 10px;">Generated by Elite Angel Investing Marketplace</p>
          <p>© ${new Date().getFullYear()} Elite Angel Investing Marketplace. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }
}

// Export singleton instance
export const taxPdfService = new TaxPdfService();
