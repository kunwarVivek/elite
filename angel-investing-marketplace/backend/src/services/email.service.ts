import { logger } from '../config/logger.js';
import { sendEmail as sendEmailUtil, EmailOptions } from '../config/email.js';

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

export interface SendEmailOptions {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  priority?: 'high' | 'normal' | 'low';
}

export class EmailService {
  async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    try {
      logger.info('Sending email via EmailService', {
        to: options.to,
        subject: options.subject,
        priority: options.priority || 'normal'
      });

      // Convert our service options to the config email options
      const emailOptions: EmailOptions = {
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType
        })),
        priority: options.priority
      };

      const result = await sendEmailUtil(emailOptions);

      if (result.success) {
        return {
          success: true,
          messageId: result.messageId,
          provider: 'nodemailer'
        };
      } else {
        return {
          success: false,
          error: result.error,
          provider: 'nodemailer'
        };
      }
    } catch (error) {
      logger.error('EmailService error', {
        error: error instanceof Error ? error.message : String(error),
        to: options.to,
        subject: options.subject
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'nodemailer'
      };
    }
  }

  async sendBulkEmail(
    recipients: Array<{ email: string; data?: Record<string, any> }>,
    options: Omit<SendEmailOptions, 'to'>
  ): Promise<EmailSendResult[]> {
    logger.info('Sending bulk email', {
      recipientCount: recipients.length,
      subject: options.subject
    });

    const results: EmailSendResult[] = [];

    // Process in batches to avoid overwhelming the email server
    const batchSize = 10;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const batchPromises = batch.map(async (recipient) => {
        const personalizedOptions = {
          ...options,
          to: [recipient.email],
          // Merge recipient data with global data
          html: this.personalizeContent(options.html, { ...options, ...recipient.data })
        };

        return this.sendEmail(personalizedOptions);
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to be respectful to email server
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successCount = results.filter(r => r.success).length;
    logger.info('Bulk email completed', {
      total: recipients.length,
      successful: successCount,
      failed: recipients.length - successCount
    });

    return results;
  }

  private personalizeContent(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  async sendTemplateEmail(
    to: string[],
    template: string,
    data: Record<string, any>,
    options: Partial<SendEmailOptions> = {}
  ): Promise<EmailSendResult> {
    // Get template from config
    const { emailTemplates } = await import('../config/email.js');
    const emailTemplate = emailTemplates[template as keyof typeof emailTemplates];

    if (!emailTemplate) {
      return {
        success: false,
        error: `Template '${template}' not found`,
        provider: 'nodemailer'
      };
    }

    // Process template with data
    const subject = this.personalizeContent(emailTemplate.subject, data);
    const html = this.personalizeContent(emailTemplate.html, data);
    const text = emailTemplate.text ? this.personalizeContent(emailTemplate.text, data) : undefined;

    return this.sendEmail({
      to,
      subject,
      html,
      text,
      priority: options.priority || 'normal'
    });
  }

  async scheduleEmail(
    options: SendEmailOptions,
    delay: number = 0
  ): Promise<void> {
    const { emailQueue } = await import('../config/queues.js');

    await emailQueue.add('scheduled-email', options, {
      delay,
      priority: options.priority === 'high' ? 10 : options.priority === 'low' ? 1 : 5
    });

    logger.info('Email scheduled', {
      to: options.to,
      subject: options.subject,
      delay,
      priority: options.priority
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();