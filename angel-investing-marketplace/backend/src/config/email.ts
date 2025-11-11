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

  // ============================================================================
  // SUBSCRIPTION EMAIL TEMPLATES
  // ============================================================================

  // Trial started
  trialStarted: {
    subject: 'Your {{planName}} Trial Has Started! 🎉',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #28a745;">Welcome to {{planName}}! 🎉</h1>
        <p>Hi {{name}},</p>
        <p>Great news! Your {{trialDays}}-day free trial of the <strong>{{planName}}</strong> plan has started.</p>
        <div style="background-color: #e7f5ff; border-left: 4px solid #007bff; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Trial Details:</h3>
          <p style="margin: 5px 0;"><strong>Plan:</strong> {{planName}}</p>
          <p style="margin: 5px 0;"><strong>Trial Ends:</strong> {{trialEndDate}}</p>
          <p style="margin: 5px 0;"><strong>Price After Trial:</strong> {{price}}</p>
        </div>
        <h3>What's Included:</h3>
        <ul style="line-height: 1.8;">
          {{features}}
        </ul>
        <p>You won't be charged until your trial ends on <strong>{{trialEndDate}}</strong>. Cancel anytime before then to avoid charges.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{dashboardUrl}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Go to Dashboard</a>
        </div>
        <p style="color: #666; font-size: 14px;">Questions? Reply to this email or visit our help center.</p>
        <p>Best regards,<br>The Angel Investing Marketplace Team</p>
      </div>
    `,
    text: 'Welcome to {{planName}}! Your {{trialDays}}-day free trial has started. Trial ends: {{trialEndDate}}. Price after trial: {{price}}.',
  },

  // Trial ending soon (3 days before)
  trialEndingSoon: {
    subject: 'Your Trial Ends in {{daysLeft}} Days',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #ff9800;">Your Trial Ends Soon</h1>
        <p>Hi {{name}},</p>
        <p>Your {{planName}} trial will end in <strong>{{daysLeft}} days</strong> on {{trialEndDate}}.</p>
        <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">What happens next?</h3>
          <p>After your trial ends, you'll automatically be subscribed to the <strong>{{planName}}</strong> plan at <strong>{{price}}</strong>.</p>
          <p style="margin: 10px 0;"><strong>First payment:</strong> {{nextBillingDate}}</p>
          <p style="margin: 10px 0;"><strong>Payment method:</strong> {{paymentMethod}}</p>
        </div>
        <h3>Your Options:</h3>
        <div style="margin: 20px 0;">
          <p><strong>1. Continue with {{planName}}</strong> - No action needed! Enjoy all the features.</p>
          <p><strong>2. Change your plan</strong> - Upgrade or downgrade to a plan that fits your needs.</p>
          <p><strong>3. Cancel anytime</strong> - Cancel before {{trialEndDate}} to avoid charges.</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{manageSubscriptionUrl}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 5px;">Manage Subscription</a>
          <a href="{{pricingUrl}}" style="background-color: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 5px;">View Plans</a>
        </div>
        <p>Best regards,<br>The Angel Investing Marketplace Team</p>
      </div>
    `,
    text: 'Your {{planName}} trial ends in {{daysLeft}} days on {{trialEndDate}}. You will be charged {{price}} on {{nextBillingDate}}. Manage subscription: {{manageSubscriptionUrl}}',
  },

  // Trial ended / Subscription activated
  trialEnded: {
    subject: 'Welcome to {{planName}}! Your Subscription is Active',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #28a745;">Welcome to {{planName}}! 🚀</h1>
        <p>Hi {{name}},</p>
        <p>Your free trial has ended and your <strong>{{planName}}</strong> subscription is now active!</p>
        <div style="background-color: #e7f5ff; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Subscription Details:</h3>
          <p style="margin: 5px 0;"><strong>Plan:</strong> {{planName}}</p>
          <p style="margin: 5px 0;"><strong>Price:</strong> {{price}}</p>
          <p style="margin: 5px 0;"><strong>Next Billing Date:</strong> {{nextBillingDate}}</p>
          <p style="margin: 5px 0;"><strong>Payment Method:</strong> {{paymentMethod}}</p>
        </div>
        <h3>What's Next:</h3>
        <p>Continue enjoying full access to all {{planName}} features. You can manage your subscription, update your payment method, or change plans at any time.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{dashboardUrl}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Go to Dashboard</a>
        </div>
        <p style="color: #666; font-size: 14px;">Need help? Our support team is here for you.</p>
        <p>Best regards,<br>The Angel Investing Marketplace Team</p>
      </div>
    `,
    text: 'Your {{planName}} subscription is now active! Price: {{price}}. Next billing: {{nextBillingDate}}.',
  },

  // Payment successful (receipt)
  paymentSuccessful: {
    subject: 'Payment Received - {{planName}} Subscription',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #28a745;">Payment Received ✓</h1>
        <p>Hi {{name}},</p>
        <p>Thank you! We've successfully processed your payment for the <strong>{{planName}}</strong> subscription.</p>
        <div style="background-color: #f8f9fa; border: 2px solid #28a745; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #28a745;">Receipt</h3>
          <p style="margin: 5px 0;"><strong>Date:</strong> {{paymentDate}}</p>
          <p style="margin: 5px 0;"><strong>Amount:</strong> {{amount}}</p>
          <p style="margin: 5px 0;"><strong>Plan:</strong> {{planName}}</p>
          <p style="margin: 5px 0;"><strong>Billing Period:</strong> {{billingPeriod}}</p>
          <p style="margin: 5px 0;"><strong>Payment Method:</strong> {{paymentMethod}}</p>
          <p style="margin: 5px 0;"><strong>Invoice:</strong> <a href="{{invoiceUrl}}" style="color: #007bff;">View Invoice</a></p>
        </div>
        <p>Your subscription is active and will renew on <strong>{{nextBillingDate}}</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{invoiceUrl}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Download Invoice</a>
        </div>
        <p style="color: #666; font-size: 14px;">Keep this email for your records. For questions about this payment, reply to this email.</p>
        <p>Best regards,<br>The Angel Investing Marketplace Team</p>
      </div>
    `,
    text: 'Payment received for {{planName}} subscription. Amount: {{amount}}. Date: {{paymentDate}}. Next billing: {{nextBillingDate}}. Invoice: {{invoiceUrl}}',
  },

  // Payment failed
  paymentFailed: {
    subject: 'Action Required: Payment Failed for {{planName}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc3545;">Payment Failed ⚠️</h1>
        <p>Hi {{name}},</p>
        <p>We were unable to process your payment for the <strong>{{planName}}</strong> subscription.</p>
        <div style="background-color: #fff3cd; border: 2px solid #dc3545; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #dc3545;">Payment Details:</h3>
          <p style="margin: 5px 0;"><strong>Amount:</strong> {{amount}}</p>
          <p style="margin: 5px 0;"><strong>Payment Method:</strong> {{paymentMethod}}</p>
          <p style="margin: 5px 0;"><strong>Reason:</strong> {{failureReason}}</p>
        </div>
        <h3>What This Means:</h3>
        <p>Your subscription is currently <strong>past due</strong>. To avoid service interruption, please update your payment method or retry the payment.</p>
        <p><strong>We'll retry automatically</strong> in the next few days, but you can update your payment method now to restore access immediately.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{updatePaymentUrl}}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Update Payment Method</a>
        </div>
        <p style="color: #666; font-size: 14px;">Having trouble? Contact our support team for assistance.</p>
        <p>Best regards,<br>The Angel Investing Marketplace Team</p>
      </div>
    `,
    text: 'Payment failed for {{planName}} subscription. Amount: {{amount}}. Reason: {{failureReason}}. Please update your payment method: {{updatePaymentUrl}}',
  },

  // Upcoming payment (7 days before)
  upcomingPayment: {
    subject: 'Upcoming Payment: {{amount}} on {{billingDate}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #007bff;">Upcoming Payment Reminder</h1>
        <p>Hi {{name}},</p>
        <p>This is a friendly reminder that your next payment for the <strong>{{planName}}</strong> subscription is coming up.</p>
        <div style="background-color: #e7f5ff; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Payment Details:</h3>
          <p style="margin: 5px 0;"><strong>Amount:</strong> {{amount}}</p>
          <p style="margin: 5px 0;"><strong>Billing Date:</strong> {{billingDate}}</p>
          <p style="margin: 5px 0;"><strong>Payment Method:</strong> {{paymentMethod}}</p>
          <p style="margin: 5px 0;"><strong>Plan:</strong> {{planName}}</p>
        </div>
        <p>Your payment method will be automatically charged on <strong>{{billingDate}}</strong>. No action is needed unless you want to make changes.</p>
        <h3>Need to Make Changes?</h3>
        <ul style="line-height: 1.8;">
          <li>Update your payment method</li>
          <li>Change your subscription plan</li>
          <li>View your billing history</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{manageSubscriptionUrl}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Manage Subscription</a>
        </div>
        <p>Best regards,<br>The Angel Investing Marketplace Team</p>
      </div>
    `,
    text: 'Upcoming payment reminder: {{amount}} will be charged on {{billingDate}} for {{planName}} subscription. Payment method: {{paymentMethod}}. Manage subscription: {{manageSubscriptionUrl}}',
  },

  // Subscription canceled
  subscriptionCanceled: {
    subject: 'Subscription Canceled - {{planName}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6c757d;">Subscription Canceled</h1>
        <p>Hi {{name}},</p>
        <p>Your <strong>{{planName}}</strong> subscription has been canceled as requested.</p>
        <div style="background-color: #f8f9fa; border-left: 4px solid #6c757d; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Cancellation Details:</h3>
          <p style="margin: 5px 0;"><strong>Plan:</strong> {{planName}}</p>
          <p style="margin: 5px 0;"><strong>Access Until:</strong> {{accessEndDate}}</p>
          <p style="margin: 5px 0;"><strong>Canceled On:</strong> {{canceledDate}}</p>
        </div>
        <h3>What This Means:</h3>
        <p>You'll continue to have access to all <strong>{{planName}}</strong> features until <strong>{{accessEndDate}}</strong>. After that, your account will be downgraded to the Free plan.</p>
        <p>No further charges will be made to your payment method.</p>
        <div style="background-color: #e7f5ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Changed your mind?</strong> You can reactivate your subscription anytime before {{accessEndDate}}.</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{reactivateUrl}}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reactivate Subscription</a>
        </div>
        <p style="color: #666; font-size: 14px;">We're sorry to see you go. If you have feedback on how we can improve, we'd love to hear it.</p>
        <p>Best regards,<br>The Angel Investing Marketplace Team</p>
      </div>
    `,
    text: 'Your {{planName}} subscription has been canceled. You will have access until {{accessEndDate}}. Reactivate anytime: {{reactivateUrl}}',
  },

  // Subscription reactivated
  subscriptionReactivated: {
    subject: 'Welcome Back! Your {{planName}} Subscription is Active',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #28a745;">Welcome Back! 🎉</h1>
        <p>Hi {{name}},</p>
        <p>Great news! Your <strong>{{planName}}</strong> subscription has been reactivated.</p>
        <div style="background-color: #d4edda; border: 2px solid #28a745; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #28a745;">Subscription Reactivated ✓</h3>
          <p style="margin: 5px 0;"><strong>Plan:</strong> {{planName}}</p>
          <p style="margin: 5px 0;"><strong>Price:</strong> {{price}}</p>
          <p style="margin: 5px 0;"><strong>Next Billing Date:</strong> {{nextBillingDate}}</p>
        </div>
        <p>You now have full access to all {{planName}} features again. Your subscription will continue automatically until you decide to cancel.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{dashboardUrl}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Go to Dashboard</a>
        </div>
        <p>We're glad to have you back!</p>
        <p>Best regards,<br>The Angel Investing Marketplace Team</p>
      </div>
    `,
    text: 'Welcome back! Your {{planName}} subscription has been reactivated. Price: {{price}}. Next billing: {{nextBillingDate}}.',
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

// ============================================================================
// SUBSCRIPTION EMAIL CONVENIENCE FUNCTIONS
// ============================================================================

export const sendTrialStartedEmail = async (
  to: string,
  name: string,
  planName: string,
  trialDays: number,
  trialEndDate: string,
  price: string,
  features: string,
  dashboardUrl: string
): Promise<void> => {
  await queueEmail({
    to,
    template: 'trialStarted',
    templateData: {
      name,
      planName,
      trialDays,
      trialEndDate,
      price,
      features,
      dashboardUrl,
    },
  });
};

export const sendTrialEndingSoonEmail = async (
  to: string,
  name: string,
  planName: string,
  daysLeft: number,
  trialEndDate: string,
  price: string,
  nextBillingDate: string,
  paymentMethod: string,
  manageSubscriptionUrl: string,
  pricingUrl: string
): Promise<void> => {
  await queueEmail({
    to,
    template: 'trialEndingSoon',
    templateData: {
      name,
      planName,
      daysLeft,
      trialEndDate,
      price,
      nextBillingDate,
      paymentMethod,
      manageSubscriptionUrl,
      pricingUrl,
    },
  });
};

export const sendTrialEndedEmail = async (
  to: string,
  name: string,
  planName: string,
  price: string,
  nextBillingDate: string,
  paymentMethod: string,
  dashboardUrl: string
): Promise<void> => {
  await queueEmail({
    to,
    template: 'trialEnded',
    templateData: {
      name,
      planName,
      price,
      nextBillingDate,
      paymentMethod,
      dashboardUrl,
    },
  });
};

export const sendPaymentSuccessfulEmail = async (
  to: string,
  name: string,
  planName: string,
  amount: string,
  paymentDate: string,
  billingPeriod: string,
  paymentMethod: string,
  nextBillingDate: string,
  invoiceUrl: string
): Promise<void> => {
  await queueEmail({
    to,
    template: 'paymentSuccessful',
    templateData: {
      name,
      planName,
      amount,
      paymentDate,
      billingPeriod,
      paymentMethod,
      nextBillingDate,
      invoiceUrl,
    },
  });
};

export const sendPaymentFailedEmail = async (
  to: string,
  name: string,
  planName: string,
  amount: string,
  paymentMethod: string,
  failureReason: string,
  updatePaymentUrl: string
): Promise<void> => {
  await queueEmail({
    to,
    template: 'paymentFailed',
    templateData: {
      name,
      planName,
      amount,
      paymentMethod,
      failureReason,
      updatePaymentUrl,
    },
    priority: 'high',
  });
};

export const sendUpcomingPaymentEmail = async (
  to: string,
  name: string,
  planName: string,
  amount: string,
  billingDate: string,
  paymentMethod: string,
  manageSubscriptionUrl: string
): Promise<void> => {
  await queueEmail({
    to,
    template: 'upcomingPayment',
    templateData: {
      name,
      planName,
      amount,
      billingDate,
      paymentMethod,
      manageSubscriptionUrl,
    },
  });
};

export const sendSubscriptionCanceledEmail = async (
  to: string,
  name: string,
  planName: string,
  accessEndDate: string,
  canceledDate: string,
  reactivateUrl: string
): Promise<void> => {
  await queueEmail({
    to,
    template: 'subscriptionCanceled',
    templateData: {
      name,
      planName,
      accessEndDate,
      canceledDate,
      reactivateUrl,
    },
  });
};

export const sendSubscriptionReactivatedEmail = async (
  to: string,
  name: string,
  planName: string,
  price: string,
  nextBillingDate: string,
  dashboardUrl: string
): Promise<void> => {
  await queueEmail({
    to,
    template: 'subscriptionReactivated',
    templateData: {
      name,
      planName,
      price,
      nextBillingDate,
      dashboardUrl,
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
  // Subscription emails
  sendTrialStarted: sendTrialStartedEmail,
  sendTrialEndingSoon: sendTrialEndingSoonEmail,
  sendTrialEnded: sendTrialEndedEmail,
  sendPaymentSuccessful: sendPaymentSuccessfulEmail,
  sendPaymentFailed: sendPaymentFailedEmail,
  sendUpcomingPayment: sendUpcomingPaymentEmail,
  sendSubscriptionCanceled: sendSubscriptionCanceledEmail,
  sendSubscriptionReactivated: sendSubscriptionReactivatedEmail,
};