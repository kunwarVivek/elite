# Email Notification System

## Overview

The Angel Investing Marketplace includes a comprehensive email notification system that automatically sends emails to users based on subscription lifecycle events. The system is built on top of Nodemailer with queue support for reliability.

## Architecture

### Components

1. **Email Templates** (`backend/src/config/email.ts`)
   - Pre-designed HTML email templates
   - Variable substitution with `{{variable}}` syntax
   - Responsive design with inline styles

2. **Email Service** (`backend/src/services/email.service.ts`)
   - High-level email sending API
   - Bulk email support with batching
   - Template-based email sending
   - Email queuing with retry logic

3. **Webhook Integration** (`backend/src/controllers/webhook.controller.ts`)
   - Stripe webhook event handlers
   - Automatic email triggering on subscription events
   - Error handling and logging

4. **Email Queue** (`backend/src/config/queues.ts`)
   - Background email processing
   - Retry logic with exponential backoff
   - Priority support

## Subscription Email Templates

### 1. Trial Started
**Trigger**: When a user starts a free trial
**Template**: `trialStarted`
**Data Required**:
- User name and email
- Plan name and features
- Trial duration and end date
- Price after trial
- Dashboard URL

**Function**: `sendTrialStartedEmail()`

### 2. Trial Ending Soon
**Trigger**: 3 days before trial ends (Stripe event: `customer.subscription.trial_will_end`)
**Template**: `trialEndingSoon`
**Data Required**:
- Days remaining
- Trial end date
- Next billing date and amount
- Payment method on file
- Management URLs

**Function**: `sendTrialEndingSoonEmail()`

### 3. Trial Ended / Subscription Activated
**Trigger**: When trial converts to paid subscription
**Template**: `trialEnded`
**Data Required**:
- Plan name and price
- Next billing date
- Payment method
- Dashboard URL

**Function**: `sendTrialEndedEmail()`

### 4. Payment Successful (Receipt)
**Trigger**: When invoice is paid (Stripe event: `invoice.paid`)
**Template**: `paymentSuccessful`
**Data Required**:
- Payment amount and date
- Billing period
- Payment method
- Next billing date
- Invoice URL

**Function**: `sendPaymentSuccessfulEmail()`

### 5. Payment Failed
**Trigger**: When invoice payment fails (Stripe event: `invoice.payment_failed`)
**Template**: `paymentFailed`
**Data Required**:
- Amount due
- Payment method
- Failure reason
- Update payment URL

**Function**: `sendPaymentFailedEmail()`
**Priority**: High (urgent action required)

### 6. Upcoming Payment
**Trigger**: 7 days before next billing (Stripe event: `invoice.upcoming`)
**Template**: `upcomingPayment`
**Data Required**:
- Payment amount and date
- Payment method
- Management URL

**Function**: `sendUpcomingPaymentEmail()`

### 7. Subscription Canceled
**Trigger**: When user cancels subscription
**Template**: `subscriptionCanceled`
**Data Required**:
- Plan name
- Access end date
- Cancellation date
- Reactivation URL

**Function**: `sendSubscriptionCanceledEmail()`

### 8. Subscription Reactivated
**Trigger**: When canceled subscription is reactivated
**Template**: `subscriptionReactivated`
**Data Required**:
- Plan name and price
- Next billing date
- Dashboard URL

**Function**: `sendSubscriptionReactivatedEmail()`

## Usage

### Sending Emails Manually

```typescript
import { sendTrialStartedEmail } from '@/config/email';

await sendTrialStartedEmail(
  'user@example.com',
  'John Doe',
  'Pro Plan',
  14,
  'December 1, 2025',
  '$29/month',
  '<li>Feature 1</li><li>Feature 2</li>',
  'https://app.example.com/dashboard'
);
```

### Sending Custom Emails

```typescript
import { queueEmail } from '@/config/email';

await queueEmail({
  to: ['user@example.com'],
  subject: 'Custom Email',
  html: '<p>Your custom HTML content</p>',
  text: 'Your custom text content',
  priority: 'high'
});
```

### Using Email Templates

```typescript
import { emailService } from '@/services/email.service';

await emailService.sendTemplateEmail(
  ['user@example.com'],
  'welcome', // template name
  { name: 'John Doe' }, // template data
  { priority: 'normal' }
);
```

## Configuration

### Environment Variables

Required environment variables for email configuration:

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Angel Investing Marketplace <noreply@angelinvesting.com>"

# Application URLs
FRONTEND_URL=https://app.angelinvesting.com
APP_URL=https://angelinvesting.com
```

### Email Provider Setup

#### Gmail
1. Enable 2-factor authentication
2. Generate an App Password
3. Use App Password as `SMTP_PASS`

#### SendGrid
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

#### AWS SES
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
```

### Development Mode

If SMTP is not configured, the system automatically falls back to Ethereal Email (test email service) for development:

```bash
# No SMTP configuration needed for development
# Emails will be captured at https://ethereal.email
```

## Email Queue

Emails are queued for background processing with the following features:

- **Retry Logic**: 3 attempts with exponential backoff (2s, 4s, 8s)
- **Priority Levels**: high, normal, low
- **Delayed Sending**: Schedule emails for future delivery
- **Bulk Processing**: Batched sending for mass emails (10 per batch)

### Queue Configuration

```typescript
// Queue an email with delay
await emailService.scheduleEmail(
  {
    to: ['user@example.com'],
    subject: 'Scheduled Email',
    html: '<p>Content</p>'
  },
  60000 // 1 minute delay
);
```

## Webhook Event Flow

```
Stripe Event → Webhook Controller → Email Function → Email Queue → Email Sent
```

### Example: Trial Ending Flow

1. **3 days before trial end**: Stripe sends `customer.subscription.trial_will_end` event
2. **Webhook Controller** receives event and validates signature
3. **handleTrialWillEnd()** method:
   - Fetches subscription and user from database
   - Calculates days left
   - Retrieves payment method details
   - Formats all data for email
4. **sendTrialEndingSoonEmail()** queues email
5. **Email Queue** processes and sends email
6. **User receives** "Trial Ending Soon" email

## Template Customization

### Adding New Templates

1. **Define Template** in `email.ts`:

```typescript
export const emailTemplates = {
  // ... existing templates

  customTemplate: {
    subject: 'Your Subject with {{variable}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Hello {{name}}!</h1>
        <p>{{message}}</p>
      </div>
    `,
    text: 'Hello {{name}}! {{message}}'
  }
};
```

2. **Create Convenience Function**:

```typescript
export const sendCustomEmail = async (
  to: string,
  name: string,
  message: string
): Promise<void> => {
  await queueEmail({
    to,
    template: 'customTemplate',
    templateData: { name, message }
  });
};
```

3. **Export Function**:

```typescript
export default {
  // ... existing exports
  sendCustom: sendCustomEmail
};
```

### Template Variables

All templates support variable substitution with `{{variableName}}` syntax:

```typescript
const template = 'Hello {{name}}, you have {{count}} messages!';
const compiled = compileTemplate(template, {
  name: 'John',
  count: 5
});
// Result: "Hello John, you have 5 messages!"
```

## Error Handling

The email system includes comprehensive error handling:

### Webhook Handler Level
```typescript
try {
  await sendPaymentFailedEmail(...);
  logger.info('Email sent successfully');
} catch (emailError) {
  logger.error('Failed to send email', { error: emailError });
  // Don't throw - email failure shouldn't break webhook
}
```

### Email Service Level
```typescript
async sendEmail(options) {
  try {
    const result = await emailTransporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    logger.error('Failed to send email', { error });
    return { success: false, error: error.message };
  }
}
```

### Queue Level
- **Automatic Retries**: 3 attempts with exponential backoff
- **Dead Letter Queue**: Failed emails logged for manual review
- **Error Tracking**: All failures logged with context

## Monitoring and Logging

### Email Logs

All email activity is logged with structured data:

```typescript
logger.info('Email sent successfully', {
  to: 'user@example.com',
  subject: 'Payment Received',
  messageId: 'abc123',
  template: 'paymentSuccessful'
});
```

### Monitoring Queries

Track email delivery rates:

```typescript
// In production, implement monitoring:
// - Email send success rate
// - Email bounce rate
// - Email open rate (requires tracking pixels)
// - Email click-through rate (requires link tracking)
```

## Best Practices

### 1. Always Use Queue
```typescript
// ✅ Good - queued with retry logic
await queueEmail({ to, subject, html });

// ❌ Bad - direct send, no retry
await sendEmail({ to, subject, html });
```

### 2. Set Appropriate Priority
```typescript
// High priority for urgent notifications
await queueEmail({ to, subject, html, priority: 'high' });

// Normal priority for regular emails
await queueEmail({ to, subject, html, priority: 'normal' });

// Low priority for newsletters
await queueEmail({ to, subject, html, priority: 'low' });
```

### 3. Handle Errors Gracefully
```typescript
// Don't let email failures break core functionality
try {
  await sendEmail(...);
} catch (error) {
  logger.error('Email failed', { error });
  // Continue with main flow
}
```

### 4. Personalize Content
```typescript
// Use user's name and specific data
await sendTrialStartedEmail(
  user.email,
  user.name || user.email, // Fallback to email if name not set
  plan.name,
  // ... other personalized data
);
```

### 5. Test Before Production
```typescript
// Use development mode with Ethereal Email
// Check email content at https://ethereal.email
// Verify all variables are replaced correctly
// Test email rendering across email clients
```

## Testing

### Manual Testing

1. **Start development server**:
```bash
cd backend
npm run dev
```

2. **Trigger webhook event** (use Stripe CLI):
```bash
stripe trigger customer.subscription.trial_will_end
```

3. **Check logs** for email activity:
```bash
# Look for "Email queued for sending" and "Email sent successfully"
```

4. **View test emails** at https://ethereal.email (in development mode)

### Integration Testing

```typescript
import { emailService } from '@/services/email.service';

describe('Email Notifications', () => {
  it('should send trial started email', async () => {
    const result = await emailService.sendTemplateEmail(
      ['test@example.com'],
      'trialStarted',
      {
        name: 'Test User',
        planName: 'Pro',
        trialDays: 14,
        // ... other data
      }
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });
});
```

## Troubleshooting

### Emails Not Sending

1. **Check SMTP Configuration**:
   ```bash
   echo $SMTP_HOST
   echo $SMTP_USER
   echo $SMTP_PASS
   ```

2. **Check Email Queue**:
   ```bash
   # Monitor queue processing
   # Check for stuck jobs
   ```

3. **Check Logs**:
   ```bash
   # Look for email errors
   grep "Email" logs/app.log
   ```

4. **Test SMTP Connection**:
   ```typescript
   await emailTransporter.verify();
   ```

### Emails Going to Spam

1. **Add SPF Record**:
   ```
   v=spf1 include:_spf.google.com ~all
   ```

2. **Add DKIM**:
   Configure DKIM in your email provider

3. **Add DMARC Record**:
   ```
   v=DMARC1; p=quarantine; rua=mailto:postmaster@yourdomain.com
   ```

4. **Use Verified Sender**:
   Verify your sending domain with your email provider

### Template Variables Not Replaced

1. **Check Variable Names**:
   ```typescript
   // Must match exactly (case-sensitive)
   {{name}} !== {{Name}}
   ```

2. **Check Data Object**:
   ```typescript
   // All template variables must be in data object
   templateData: {
     name: 'John',
     // missing variables will show as {{variable}}
   }
   ```

## Future Enhancements

- [ ] Email preferences per user (unsubscribe from certain types)
- [ ] Email analytics (open rate, click-through rate)
- [ ] A/B testing for email templates
- [ ] Rich email editor for admins
- [ ] Email scheduling dashboard
- [ ] Transactional email insights
- [ ] Multi-language support
- [ ] Dark mode email templates

## Summary

The email notification system provides:

- ✅ 8 subscription lifecycle email templates
- ✅ Automatic triggering via Stripe webhooks
- ✅ Queue-based delivery with retries
- ✅ Template customization support
- ✅ Comprehensive error handling
- ✅ Development and production modes
- ✅ Structured logging and monitoring
- ✅ Professional, responsive email designs

**Total Lines**: ~500 lines of templates + integration
**Files Modified**: 2 files (email.ts, webhook.controller.ts)
**Email Templates**: 8 templates for complete subscription lifecycle
**Functions**: 8 convenience functions + service methods
