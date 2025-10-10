import { Job } from 'bullmq';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { emailService } from '../services/email.service.js';

export interface EmailJobData {
  to: string | string[];
  subject: string;
  template: string;
  data?: Record<string, any>;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  priority?: 'high' | 'normal' | 'low';
  scheduledFor?: Date;
}

export interface EmailJobResult {
  success: boolean;
  messageId?: string;
  error?: string;
  metadata?: {
    provider: string;
    timestamp: string;
    recipientCount: number;
  };
}

export class EmailProcessor {
  static async process(job: Job<EmailJobData>): Promise<EmailJobResult> {
    const { to, subject, template, data = {}, cc, bcc, attachments, priority = 'normal' } = job.data;

    logger.info('Processing email job', {
      jobId: job.id,
      template,
      to: Array.isArray(to) ? to : [to],
      priority,
      recipientCount: Array.isArray(to) ? to.length : 1
    });

    try {
      // Validate email data
      await this.validateEmailData(job.data);

      // Get email template
      const emailTemplate = await this.getEmailTemplate(template);
      if (!emailTemplate) {
        throw new Error(`Email template '${template}' not found`);
      }

      // Process template with data
      const processedContent = await this.processTemplate(emailTemplate, data);

      // Send email
      const result = await emailService.sendEmail({
        to: Array.isArray(to) ? to : [to],
        cc,
        bcc,
        subject,
        html: processedContent.html,
        text: processedContent.text,
        attachments,
        priority
      });

      // Log success
      logger.info('Email sent successfully', {
        jobId: job.id,
        messageId: result.messageId,
        template,
        recipientCount: Array.isArray(to) ? to.length : 1
      });

      // Store email record in database
      await this.storeEmailRecord({
        jobId: job.id!,
        template,
        to: Array.isArray(to) ? to : [to],
        subject,
        status: 'SENT',
        messageId: result.messageId,
        provider: result.provider,
        metadata: {
          priority,
          recipientCount: Array.isArray(to) ? to.length : 1
        }
      });

      return {
        success: true,
        messageId: result.messageId,
        metadata: {
          provider: result.provider,
          timestamp: new Date().toISOString(),
          recipientCount: Array.isArray(to) ? to.length : 1
        }
      };

    } catch (error) {
      logger.error('Email job failed', {
        jobId: job.id,
        template,
        error: error instanceof Error ? error.message : String(error)
      });

      // Store failed email record
      await this.storeEmailRecord({
        jobId: job.id!,
        template,
        to: Array.isArray(to) ? to : [to],
        subject,
        status: 'FAILED',
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  private static async validateEmailData(data: EmailJobData): Promise<void> {
    if (!data.to || (Array.isArray(data.to) && data.to.length === 0)) {
      throw new Error('Email recipient is required');
    }

    if (!data.subject?.trim()) {
      throw new Error('Email subject is required');
    }

    if (!data.template?.trim()) {
      throw new Error('Email template is required');
    }

    // Validate email addresses format (basic validation)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const recipients = Array.isArray(data.to) ? data.to : [data.to];

    for (const email of recipients) {
      if (!emailRegex.test(email)) {
        throw new Error(`Invalid email address: ${email}`);
      }
    }

    if (data.cc) {
      const ccRecipients = Array.isArray(data.cc) ? data.cc : [data.cc];
      for (const email of ccRecipients) {
        if (!emailRegex.test(email)) {
          throw new Error(`Invalid CC email address: ${email}`);
        }
      }
    }

    if (data.bcc) {
      const bccRecipients = Array.isArray(data.bcc) ? data.bcc : [data.bcc];
      for (const email of bccRecipients) {
        if (!emailRegex.test(email)) {
          throw new Error(`Invalid BCC email address: ${email}`);
        }
      }
    }
  }

  private static async getEmailTemplate(templateName: string) {
    // Get template from database or configuration
    // For now, return a basic template structure
    const templates: Record<string, any> = {
      'welcome': {
        subject: 'Welcome to {{platformName}}',
        html: `
          <h1>Welcome {{userName}}!</h1>
          <p>Thank you for joining {{platformName}}. We're excited to have you on board.</p>
          <p>Your account has been successfully created and you can now start exploring investment opportunities.</p>
          <a href="{{loginUrl}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login to Your Account</a>
        `,
        text: 'Welcome {{userName}}! Thank you for joining {{platformName}}. Your account has been created successfully.'
      },
      'investment_confirmation': {
        subject: 'Investment Confirmation - {{startupName}}',
        html: `
          <h1>Investment Confirmed</h1>
          <p>Your investment in {{startupName}} has been successfully processed.</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Investment Details:</h3>
            <p><strong>Startup:</strong> {{startupName}}</p>
            <p><strong>Amount:</strong> {{investmentAmount}}</p>
            <p><strong>Investment ID:</strong> {{investmentId}}</p>
            <p><strong>Date:</strong> {{investmentDate}}</p>
          </div>
          <p>You can track your investment progress in your portfolio dashboard.</p>
        `,
        text: 'Investment confirmed for {{startupName}}. Amount: {{investmentAmount}}. Investment ID: {{investmentId}}.'
      },
      'pitch_update': {
        subject: 'Update on {{startupName}} Pitch',
        html: `
          <h1>Pitch Update</h1>
          <p>{{startupName}} has posted a new update on their pitch.</p>
          <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff;">
            {{updateContent}}
          </div>
          <a href="{{pitchUrl}}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Pitch</a>
        `,
        text: '{{startupName}} has posted a new update: {{updateContent}}'
      }
    };

    return templates[templateName] || null;
  }

  private static async processTemplate(template: any, data: Record<string, any>): Promise<{ html: string; text: string }> {
    let html = template.html || '';
    let text = template.text || '';

    // Simple template variable replacement
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      html = html.replace(new RegExp(placeholder, 'g'), String(value));
      text = text.replace(new RegExp(placeholder, 'g'), String(value));
    });

    return { html, text };
  }

  private static async storeEmailRecord(data: {
    jobId: string;
    template: string;
    to: string[];
    subject: string;
    status: 'SENT' | 'FAILED';
    messageId?: string;
    provider?: string;
    error?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await prisma.emailLog.create({
        data: {
          jobId: data.jobId,
          template: data.template,
          recipients: data.to,
          subject: data.subject,
          status: data.status,
          messageId: data.messageId,
          provider: data.provider,
          error: data.error,
          metadata: data.metadata,
          sentAt: data.status === 'SENT' ? new Date() : null,
        }
      });
    } catch (error) {
      logger.error('Failed to store email record', {
        jobId: data.jobId,
        error: error instanceof Error ? error.message : String(error)
      });
      // Don't throw here as this is not critical for the email sending process
    }
  }

  // Queue email for later sending
  static async scheduleEmail(emailData: EmailJobData, delay: number = 0): Promise<void> {
    const { emailQueue } = await import('../config/queues.js');

    await emailQueue.add('scheduled-email', emailData, {
      delay,
      priority: emailData.priority === 'high' ? 10 : emailData.priority === 'low' ? 1 : 5
    });

    logger.info('Email scheduled', {
      template: emailData.template,
      delay,
      priority: emailData.priority
    });
  }

  // Send immediate email
  static async sendEmail(emailData: EmailJobData): Promise<EmailJobResult> {
    const { emailQueue } = await import('../config/queues.js');

    const job = await emailQueue.add('immediate-email', emailData, {
      priority: emailData.priority === 'high' ? 10 : emailData.priority === 'low' ? 1 : 5
    });

    logger.info('Email queued for immediate sending', {
      jobId: job.id,
      template: emailData.template,
      priority: emailData.priority
    });

    // Wait for completion (in production, you might want to handle this differently)
    const result = await job.waitUntilFinished(emailQueue.opts);

    return result as EmailJobResult;
  }
}

export default EmailProcessor;