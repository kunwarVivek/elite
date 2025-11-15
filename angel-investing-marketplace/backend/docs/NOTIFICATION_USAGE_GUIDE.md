# Notification System Usage Guide

## Quick Start

### 1. Import the Service

```typescript
import { notificationService } from '../services/notification.service.js';
import { NotificationType, NotificationPriority } from '@prisma/client';
```

### 2. Send Your First Notification

```typescript
// Simple notification
await notificationService.createNotification({
  recipientId: userId,
  type: NotificationType.SYSTEM,
  title: 'Welcome to the platform!',
  content: 'Get started by exploring investment opportunities.',
  actionUrl: '/dashboard',
  priority: NotificationPriority.LOW
});
```

## Common Use Cases

### Investment Notifications

#### When a user makes an investment:
```typescript
// In your investment creation handler
await notificationService.createInvestmentNotification(userId, {
  investmentId: investment.id,
  startupId: startup.id,
  startupName: startup.name,
  amount: investment.amount,
  status: 'CONFIRMED',
  message: `Successfully invested $${investment.amount.toLocaleString()} in ${startup.name}`
});
```

#### When an investment status changes:
```typescript
// In your investment update handler
await notificationService.createInvestmentUpdateNotification(userId, {
  investmentId: investment.id,
  startupName: startup.name,
  updateMessage: `Your investment status changed to: ${newStatus}`
});
```

#### When a startup reaches a milestone:
```typescript
// In your milestone handler
const investors = await getInvestorsForStartup(startupId);

for (const investor of investors) {
  await notificationService.createInvestmentUpdateNotification(investor.userId, {
    investmentId: investor.investmentId,
    startupName: startup.name,
    updateMessage: `${startup.name} reached a major milestone: ${milestone.name}!`,
    updateType: 'MILESTONE'
  });
}
```

### Pitch Notifications

#### When a new pitch is created:
```typescript
// Send to all matching investors
const interestedInvestors = await getInvestorsByIndustry(pitch.industry);

await notificationService.createBulkNotifications({
  recipients: interestedInvestors.map(i => i.userId),
  type: NotificationType.PITCH,
  titleTemplate: 'New Pitch: {{pitchName}}',
  contentTemplate: '{{startupName}} is seeking investment in {{industry}}',
  actionUrlTemplate: '/pitches/{{pitchId}}',
  data: {
    pitchId: pitch.id,
    pitchName: pitch.title,
    startupName: startup.name,
    industry: pitch.industry
  },
  priority: NotificationPriority.HIGH
});
```

#### When a pitch status updates:
```typescript
await notificationService.createPitchUpdateNotification(userId, {
  pitchId: pitch.id,
  pitchName: pitch.title,
  updateMessage: `Pitch status changed to: ${newStatus}`
});
```

### Message Notifications

#### When a user receives a message:
```typescript
// In your message creation handler
await notificationService.createMessageNotification(recipientId, {
  conversationId: conversation.id,
  senderId: sender.id,
  senderName: sender.name,
  messagePreview: message.content.substring(0, 100)
});
```

### Payment Notifications

#### When a payment is processed:
```typescript
await notificationService.createPaymentNotification(userId, {
  paymentId: payment.id,
  amount: payment.amount,
  status: payment.status,
  message: `Payment of $${payment.amount.toLocaleString()} has been ${payment.status.toLowerCase()}`
});
```

#### Payment failure:
```typescript
await notificationService.createPaymentNotification(userId, {
  paymentId: payment.id,
  amount: payment.amount,
  status: 'FAILED',
  message: `Payment of $${payment.amount.toLocaleString()} failed. Please update your payment method.`
});
```

### System Notifications

#### Broadcast to all users:
```typescript
await notificationService.broadcastSystemNotification({
  message: 'Platform maintenance scheduled for tonight at 2 AM UTC',
  actionUrl: '/maintenance-schedule',
  priority: NotificationPriority.MEDIUM
});
```

#### Broadcast to specific user groups:
```typescript
// To all active investors
await notificationService.broadcastSystemNotification({
  message: 'New investment opportunities available in the marketplace',
  actionUrl: '/opportunities',
  priority: NotificationPriority.LOW,
  filters: {
    role: ['INVESTOR'],
    isActive: true
  }
});

// To all startup founders
await notificationService.broadcastSystemNotification({
  message: 'New pitch guidelines published',
  actionUrl: '/resources/pitch-guidelines',
  filters: {
    role: ['FOUNDER']
  }
});
```

## Advanced Usage

### Custom Notifications with Templates

```typescript
// Create custom notification with template interpolation
await notificationService.createFromTemplate(
  userId,
  NotificationType.INVESTMENT_UPDATE,
  {
    investmentId: 'inv_123',
    startupName: 'TechCo',
    updateMessage: 'Quarterly report is now available',
    quarterlyRevenue: '$500K',
    growthRate: '25%'
  },
  {
    priority: NotificationPriority.MEDIUM,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
  }
);
```

### Scheduled Notifications

```typescript
// Schedule for future delivery
await notificationService.createNotification({
  recipientId: userId,
  type: NotificationType.SYSTEM,
  title: 'Reminder: Investment closes tomorrow',
  content: 'The investment round for TechCo closes in 24 hours',
  actionUrl: '/investments/inv_123',
  scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
});
```

### Expiring Notifications

```typescript
// Notification that expires in 7 days
await notificationService.createNotification({
  recipientId: userId,
  type: NotificationType.PITCH,
  title: 'Limited Time Opportunity',
  content: 'Early bird investment opportunity in TechCo',
  actionUrl: '/pitches/pitch_123',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  priority: NotificationPriority.HIGH
});
```

## User Preference Management

### Get User Preferences

```typescript
const preferences = await notificationService.getUserPreferences(userId);

console.log('Email enabled:', preferences.email?.enabled);
console.log('Quiet hours:', preferences.quietHours);
```

### Update User Preferences

```typescript
// Update email preferences
await notificationService.updateUserPreferences(userId, {
  email: {
    enabled: true,
    frequency: 'IMMEDIATE',
    types: [
      NotificationType.INVESTMENT,
      NotificationType.INVESTMENT_UPDATE,
      NotificationType.PAYMENT
    ]
  }
});

// Enable quiet hours
await notificationService.updateUserPreferences(userId, {
  quietHours: {
    enabled: true,
    startTime: '22:00',
    endTime: '08:00',
    timezone: 'America/New_York',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6] // All days
  }
});

// Disable push notifications
await notificationService.updateUserPreferences(userId, {
  push: {
    enabled: false
  }
});
```

## Bulk Operations

### Mark Multiple Notifications as Read

```typescript
const notificationIds = ['notif_1', 'notif_2', 'notif_3'];
const markedCount = await notificationService.markMultipleAsRead(notificationIds, userId);

console.log(`Marked ${markedCount} notifications as read`);
```

### Mark All Notifications as Read

```typescript
// Mark all unread
const count = await notificationService.markAllAsRead(userId);

// Mark all before a specific date
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const count = await notificationService.markAllAsRead(userId, thirtyDaysAgo);
```

### Delete Old Notifications

```typescript
// Delete specific notifications
await notificationService.deleteMultiple(['notif_1', 'notif_2'], userId);

// Delete all notifications
await notificationService.deleteAll(userId);

// Delete by type
await notificationService.deleteByType(userId, NotificationType.SYSTEM);
```

## Cleanup & Maintenance

### Scheduled Cleanup Tasks

```typescript
// Run this in a cron job (e.g., daily at 2 AM)
async function cleanupNotifications() {
  // Clean up expired notifications
  const expiredCount = await notificationService.cleanupExpiredNotifications();
  logger.info(`Cleaned up ${expiredCount} expired notifications`);

  // Clean up old read notifications (older than 90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const oldNotifications = await prisma.notification.deleteMany({
    where: {
      isRead: true,
      readAt: {
        lte: ninetyDaysAgo
      }
    }
  });
  logger.info(`Deleted ${oldNotifications.count} old read notifications`);
}
```

## Analytics & Reporting

### Get User Notification Statistics

```typescript
const stats = await notificationService.getNotificationStats(userId);

console.log(`Total notifications: ${stats.total}`);
console.log(`Unread: ${stats.unread}`);
console.log(`Read rate: ${stats.readRate}%`);
console.log('By type:', stats.byType);
console.log('By priority:', stats.byPriority);
```

### Get Platform-Wide Statistics

```typescript
const platformStats = await notificationService.getNotificationStats();

console.log(`Total notifications sent: ${platformStats.total}`);
console.log(`Platform read rate: ${platformStats.readRate}%`);
```

## Integration Examples

### Express Route Handler

```typescript
import { Request, Response } from 'express';
import { notificationService } from '../services/notification.service.js';

// Create investment and notify user
app.post('/api/investments', async (req: Request, res: Response) => {
  try {
    // Create investment
    const investment = await createInvestment(req.body);

    // Send notification
    await notificationService.createInvestmentNotification(req.user.id, {
      investmentId: investment.id,
      startupId: investment.startupId,
      startupName: investment.startup.name,
      amount: investment.amount,
      status: investment.status
    });

    res.json({ success: true, investment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Background Job (BullMQ)

```typescript
import { notificationService } from '../services/notification.service.js';
import { Worker } from 'bullmq';

// Process investment milestones
const milestoneWorker = new Worker('milestones', async (job) => {
  const { startupId, milestone } = job.data;

  // Get all investors
  const investments = await prisma.investment.findMany({
    where: { startupId },
    include: { user: true }
  });

  // Notify all investors
  const notifications = await notificationService.createBulkNotifications({
    recipients: investments.map(i => i.userId),
    type: NotificationType.INVESTMENT_UPDATE,
    titleTemplate: 'Milestone Achieved: {{milestoneName}}',
    contentTemplate: '{{startupName}} has achieved: {{milestoneDescription}}',
    actionUrlTemplate: '/investments/{{investmentId}}',
    data: {
      milestoneName: milestone.name,
      milestoneDescription: milestone.description,
      startupName: startup.name
    },
    priority: NotificationPriority.MEDIUM
  });

  return { sent: notifications.length };
});
```

### Webhook Handler

```typescript
// Stripe webhook - payment succeeded
app.post('/webhooks/stripe', async (req, res) => {
  const event = req.body;

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;

    // Find user by payment metadata
    const payment = await findPaymentByIntentId(paymentIntent.id);

    // Notify user
    await notificationService.createPaymentNotification(payment.userId, {
      paymentId: payment.id,
      amount: paymentIntent.amount / 100, // Convert from cents
      status: 'COMPLETED',
      message: `Your payment of $${(paymentIntent.amount / 100).toLocaleString()} has been processed successfully`
    });
  }

  res.json({ received: true });
});
```

## Best Practices

### 1. Always Use Helper Methods When Available

```typescript
// Good - Uses helper method
await notificationService.createInvestmentNotification(userId, data);

// Avoid - Manual creation when helper exists
await notificationService.createNotification({
  recipientId: userId,
  type: NotificationType.INVESTMENT,
  title: 'Investment Created',
  // ... manual configuration
});
```

### 2. Use Appropriate Priority Levels

```typescript
// HIGH - Critical actions that need immediate attention
await notificationService.createPaymentNotification(userId, {
  paymentId: payment.id,
  amount: payment.amount,
  status: 'FAILED',
  message: 'Payment failed - action required'
});

// MEDIUM - Important but not urgent
await notificationService.createInvestmentUpdateNotification(userId, {
  investmentId: investment.id,
  startupName: startup.name,
  updateMessage: 'Quarterly report available'
});

// LOW - Informational only
await notificationService.createSystemNotification(userId, {
  message: 'New features available in the dashboard',
  priority: NotificationPriority.LOW
});
```

### 3. Handle Errors Gracefully

```typescript
try {
  await notificationService.createNotification({
    recipientId: userId,
    type: NotificationType.INVESTMENT,
    title: 'Investment Confirmation',
    content: 'Your investment has been confirmed'
  });
} catch (error) {
  // Don't fail the main operation if notification fails
  logger.error('Failed to send notification', { error, userId });
  // Continue with the main operation
}
```

### 4. Use Bulk Operations for Multiple Users

```typescript
// Good - Single bulk operation
await notificationService.createBulkNotifications({
  recipients: userIds,
  type: NotificationType.SYSTEM,
  titleTemplate: 'System Update',
  contentTemplate: 'Platform maintenance complete'
});

// Avoid - Loop with individual notifications
for (const userId of userIds) {
  await notificationService.createSystemNotification(userId, {
    message: 'Platform maintenance complete'
  });
}
```

### 5. Include Action URLs

```typescript
// Good - Provides clear call to action
await notificationService.createNotification({
  recipientId: userId,
  type: NotificationType.PITCH,
  title: 'New Pitch Available',
  content: 'TechCo is seeking $500K in funding',
  actionUrl: `/pitches/${pitch.id}` // User can click to view
});

// Avoid - No action URL
await notificationService.createNotification({
  recipientId: userId,
  type: NotificationType.PITCH,
  title: 'New Pitch Available',
  content: 'TechCo is seeking $500K in funding'
  // No way to easily navigate to the pitch
});
```

### 6. Test with Test Notifications

```typescript
// Development/testing
if (process.env.NODE_ENV === 'development') {
  await notificationService.createTestNotification(userId, {
    type: NotificationType.INVESTMENT,
    channel: 'EMAIL',
    title: 'Test Investment Notification',
    content: 'This is a test to verify email delivery'
  });
}
```

## Debugging

### Check Notification Delivery

```typescript
// Get user's notification preferences
const prefs = await notificationService.getUserPreferences(userId);
console.log('Email enabled:', prefs.email?.enabled);
console.log('In quiet hours:', /* check time */);

// Check recent notifications
const notifications = await prisma.notification.findMany({
  where: { userId },
  orderBy: { createdAt: 'desc' },
  take: 10
});
console.log('Recent notifications:', notifications);
```

### View Notification Logs

```typescript
// All notification operations are logged with Winston
// Check logs for:
// - "Notification created" (INFO)
// - "Duplicate notification detected" (DEBUG)
// - "In-app notification delivered" (DEBUG)
// - "Email notification delivered" (DEBUG)
// - "Failed to deliver notification" (ERROR)
```

## Performance Tips

### 1. Use Pagination for Large Lists

```typescript
// Get notifications with pagination
const result = await getNotificationsList(userId, {
  page: 1,
  limit: 20,
  isRead: false
});
```

### 2. Clean Up Old Notifications Regularly

```typescript
// Set up a daily cron job
const cron = require('node-cron');

cron.schedule('0 2 * * *', async () => {
  await notificationService.cleanupExpiredNotifications();
});
```

### 3. Cache Unread Counts

```typescript
// Cache in Redis for frequently accessed counts
const cachedCount = await redis.get(`unread_count:${userId}`);
if (cachedCount) {
  return parseInt(cachedCount);
}

const count = await notificationService.getUnreadCount(userId);
await redis.setex(`unread_count:${userId}`, 300, count); // Cache for 5 minutes
return count;
```

## Troubleshooting

### Notifications Not Being Received

1. **Check user preferences:**
   ```typescript
   const prefs = await notificationService.getUserPreferences(userId);
   console.log(prefs);
   ```

2. **Check for quiet hours:**
   - Verify current time is not in user's quiet hours
   - Note: HIGH priority notifications bypass quiet hours

3. **Check WebSocket connection:**
   - Verify user is connected to WebSocket
   - Check WebSocket service logs

4. **Check email delivery:**
   - Verify email service is configured
   - Check email service logs
   - Verify user's email is valid

### Duplicate Notifications

The system automatically prevents duplicates within a 5-minute window. If you need to send a similar notification:

```typescript
// Add unique data to differentiate
await notificationService.createNotification({
  recipientId: userId,
  type: NotificationType.SYSTEM,
  title: 'System Update',
  content: 'Platform maintenance complete',
  data: {
    timestamp: Date.now(), // Makes it unique
    maintenanceId: 'maint_123'
  }
});
```

## Support

For questions or issues:
- Check logs: Winston logger outputs to console/files
- Review Prisma queries: Enable query logging in development
- Check WebSocket service: Verify user connections
- Test with test notifications: Use `/api/notifications/test` endpoint

## Future Enhancements

The notification service is designed to be extended. Potential additions:
- Push notification providers (Firebase, OneSignal)
- SMS providers (Twilio, AWS SNS)
- Notification scheduling and queuing
- A/B testing for notification content
- Rich media notifications (images, videos)
- Notification grouping/threading
- Read receipts and delivery tracking
