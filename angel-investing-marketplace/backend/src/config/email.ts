import nodemailer from 'nodemailer';
import { env } from './environment.js';
import { logger } from './logger.js';

// Email configuration interface
export interface EmailConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user?: string;
    pass?: string;
  };
  from?: string;
  templates?: {
    [key: string]: EmailTemplate;
  };
}

// Email template interface
export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

// Email sending options
export interface EmailOptions {
  to: string | string[];
  subject?: string;
  html?: string;
  text?: string;
  template?: string;
  templateData?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
    contentType?: string;
  }>;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  priority?: 'high' | 'normal' | 'low';
}

// Create email transporter
const createTransporter = () => {
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false, // For development/testing
      },
    });
  }

  // Fallback to ethereal for development/testing
  logger.warn('SMTP not configured, using ethereal email for development');
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'ethereal.user@ethereal.email', // Will be replaced with test account
      pass: 'test', // Will be replaced with test account
    },
  });
};

// Email transporter instance
export const emailTransporter = createTransporter();

// Email templates
export const emailTemplates = {
  // Welcome email
  welcome: {
    subject: 'Welcome to Angel Investing Marketplace!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welcome to Angel Investing Marketplace!</h1>
        <p>Hi {{name}},</p>
        <p>Welcome to our platform! We're excited to have you join our community of angel investors and entrepreneurs.</p>
        <p>Your account has been successfully created and you can now start exploring investment opportunities.</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Next Steps:</h3>
          <ul>
            <li>Complete your profile</li>
            <li>Verify your email address</li>
            <li>Explore available startups</li>
            <li>Start investing in promising opportunities</li>
          </ul>
        </div>
        <p>If you have any questions, feel free to reach out to our support team.</p>
        <p>Best regards,<br>The Angel Investing Marketplace Team</p>
      </div>
    `,
    text: 'Welcome to Angel Investing Marketplace! Your account has been created successfully.',
  },

  // Email verification
  emailVerification: {
    subject: 'Verify Your Email Address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Verify Your Email Address</h1>
        <p>Hi {{name}},</p>
        <p>Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{verificationUrl}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
        </div>
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">{{verificationUrl}}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
        <p>Best regards,<br>The Angel Investing Marketplace Team</p>
      </div>
    `,
    text: 'Please verify your email address by visiting: {{verificationUrl}}',
  },

  // Password reset
  passwordReset: {
    subject: 'Reset Your Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Reset Your Password</h1>
        <p>Hi {{name}},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{resetUrl}}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">{{resetUrl}}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
        <p>Best regards,<br>The Angel Investing Marketplace Team</p>
      </div>
    `,
    text: 'Reset your password by visiting: {{resetUrl}}',
  },

  // Investment notification
  investmentNotification: {
    subject: 'Investment Update - {{startupName}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Investment Update</h1>
        <p>Hi {{investorName}},</p>
        <p>There's an update regarding your investment in <strong>{{startupName}}</strong>.</p>
        <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>{{updateTitle}}</h3>
          <p>{{updateContent}}</p>
        </div>
        <p>You can view more details in your investment dashboard.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{dashboardUrl}}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">View Dashboard</a>
        </div>
        <p>Best regards,<br>The Angel Investing Marketplace Team</p>
      </div>
    `,
    text: 'Investment update for {{startupName}}: {{updateTitle}} - {{updateContent}}',
  },

  // Startup pitch notification
  startupPitchNotification: {
    subject: 'New Investment Opportunity - {{startupName}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">New Investment Opportunity</h1>
        <p>Hi {{investorName}},</p>
        <p>A new startup pitch is now available on our platform:</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h2>{{startupName}}</h2>
          <p><strong>Industry:</strong> {{industry}}</p>
          <p><strong>Funding Goal:</strong> {{fundingGoal}}</p>
          <p>{{pitchSummary}}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{pitchUrl}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">View Pitch</a>
        </div>
        <p>Don't miss out on this opportunity!</p>
        <p>Best regards,<br>The Angel Investing Marketplace Team</p>
      </div>
    `,
    text: 'New investment opportunity: {{startupName}} - {{pitchSummary}}',
  },

  // Account security alert
  accountSecurityAlert: {
    subject: 'Security Alert - Account Activity',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc3545;">Security Alert</h1>
        <p>Hi {{name}},</p>
        <p>We detected unusual activity on your account. If this wasn't you, please take immediate action:</p>
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Activity:</strong> {{activity}}</p>
          <p><strong>Time:</strong> {{timestamp}}</p>
          <p><strong>IP Address:</strong> {{ipAddress}}</p>
          <p><strong>Location:</strong> {{location}}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{securityUrl}}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Secure Account</a>
        </div>
        <p>If this was you, you can safely ignore this email.</p>
        <p>Best regards,<br>The Angel Investing Marketplace Security Team</p>
      </div>
    `,
    text: 'Security alert: Unusual activity detected on your account. Activity: {{activity}} at {{timestamp}}',
  },
};

// Email utility functions
export const compileTemplate = (template: string, data: Record<string, any>): string => {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match;
  });
};

export const sendEmail = async (options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    // Prepare email content
    let html = options.html;
    let text = options.text;
    let subject = options.subject;

    // Use template if specified
    if (options.template && options.template in emailTemplates) {
      const template = emailTemplates[options.template as keyof typeof emailTemplates];
      subject = compileTemplate(template.subject, options.templateData || {});
      html = compileTemplate(template.html, options.templateData || {});
      text = template.text ? compileTemplate(template.text, options.templateData || {}) : undefined;
    }

    // Prepare recipients
    const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;

    // Email options for nodemailer
    const mailOptions = {
      from: env.SMTP_FROM || 'Angel Investing Marketplace <noreply@angelinvesting.com>',
      to,
      subject,
      html,
      text,
      cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
      bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
      replyTo: options.replyTo,
      attachments: options.attachments,
      // Set priority headers
      headers: options.priority ? {
        'X-Priority': options.priority === 'high' ? '1' : options.priority === 'low' ? '5' : '3',
      } : undefined,
    };

    // Send email
    const result = await emailTransporter.sendMail(mailOptions);

    logger.info('Email sent successfully', {
      to,
      subject,
      messageId: result.messageId,
      template: options.template,
    });

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    logger.error('Failed to send email', {
      to: options.to,
      subject: options.subject,
      error,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Queue email for sending
export const queueEmail = async (options: EmailOptions, delay?: number): Promise<void> => {
  try {
    const { emailQueue } = await import('./queues.js');

    await emailQueue.add(
      'send-email',
      {
        ...options,
        queuedAt: new Date().toISOString(),
      },
      {
        delay: delay || 0,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );

    logger.info('Email queued for sending', {
      to: options.to,
      subject: options.subject,
      delay,
    });
  } catch (error) {
    logger.error('Failed to queue email', { error, options: options.to });
    throw error;
  }
};

// Convenience functions for common email types
export const sendWelcomeEmail = async (to: string, name: string): Promise<void> => {
  await queueEmail({
    to,
    template: 'welcome',
    templateData: { name },
  });
};

export const sendVerificationEmail = async (to: string, name: string, verificationUrl: string): Promise<void> => {
  await queueEmail({
    to,
    template: 'emailVerification',
    templateData: { name, verificationUrl },
  });
};

export const sendPasswordResetEmail = async (to: string, name: string, resetUrl: string): Promise<void> => {
  await queueEmail({
    to,
    template: 'passwordReset',
    templateData: { name, resetUrl },
  });
};

export const sendInvestmentNotification = async (
  to: string,
  investorName: string,
  startupName: string,
  updateTitle: string,
  updateContent: string,
  dashboardUrl: string
): Promise<void> => {
  await queueEmail({
    to,
    template: 'investmentNotification',
    templateData: {
      investorName,
      startupName,
      updateTitle,
      updateContent,
      dashboardUrl,
    },
  });
};

export const sendStartupPitchNotification = async (
  to: string,
  investorName: string,
  startupName: string,
  industry: string,
  fundingGoal: string,
  pitchSummary: string,
  pitchUrl: string
): Promise<void> => {
  await queueEmail({
    to,
    template: 'startupPitchNotification',
    templateData: {
      investorName,
      startupName,
      industry,
      fundingGoal,
      pitchSummary,
      pitchUrl,
    },
  });
};

export const sendSecurityAlert = async (
  to: string,
  name: string,
  activity: string,
  timestamp: string,
  ipAddress: string,
  location: string,
  securityUrl: string
): Promise<void> => {
  await queueEmail({
    to,
    template: 'accountSecurityAlert',
    templateData: {
      name,
      activity,
      timestamp,
      ipAddress,
      location,
      securityUrl,
    },
  });
};

export default {
  transporter: emailTransporter,
  templates: emailTemplates,
  send: sendEmail,
  queue: queueEmail,
  sendWelcome: sendWelcomeEmail,
  sendVerification: sendVerificationEmail,
  sendPasswordReset: sendPasswordResetEmail,
  sendInvestmentNotification,
  sendStartupPitchNotification,
  sendSecurityAlert,
};