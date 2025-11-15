# Notification System - Quick Reference Card

## Import

```typescript
import { notificationService } from '../services/notification.service.js';
import { NotificationType, NotificationPriority } from '@prisma/client';
```

## Quick Methods

### Investment
```typescript
// New investment
await notificationService.createInvestmentNotification(userId, {
  investmentId, startupId, startupName, amount, status
});

// Investment update
await notificationService.createInvestmentUpdateNotification(userId, {
  investmentId, startupName, updateMessage
});
```

### Pitch
```typescript
// New pitch
await notificationService.createPitchNotification(userId, {
  pitchId, pitchName, startupName, message
});

// Pitch update
await notificationService.createPitchUpdateNotification(userId, {
  pitchId, pitchName, updateMessage
});
```

### Payment
```typescript
await notificationService.createPaymentNotification(userId, {
  paymentId, amount, status, message
});
```

### Message
```typescript
await notificationService.createMessageNotification(userId, {
  conversationId, senderId, senderName, messagePreview
});
```

### System
```typescript
// Single user
await notificationService.createSystemNotification(userId, {
  message, actionUrl, priority
});

// Broadcast
await notificationService.broadcastSystemNotification({
  message,
  actionUrl,
  priority,
  filters: { role: ['INVESTOR'], isActive: true }
});
```

## Notification Types

| Type | Priority | Use Case |
|------|----------|----------|
| `INVESTMENT` | HIGH | New investment created |
| `INVESTMENT_UPDATE` | MEDIUM | Investment milestones, updates |
| `PITCH` | HIGH | New pitch available |
| `PITCH_UPDATE` | MEDIUM | Pitch status changes |
| `MESSAGE` | MEDIUM | Direct messages |
| `PAYMENT` | HIGH | Payment confirmations/failures |
| `SYNDICATE` | MEDIUM | Syndicate updates |
| `SYSTEM` | LOW | Platform announcements |

## Priority Levels

| Priority | Channels | Bypasses Quiet Hours | Email Priority |
|----------|----------|----------------------|----------------|
| `HIGH` | In-App + Email + Push | Yes | high |
| `MEDIUM` | In-App + Email | No | normal |
| `LOW` | In-App only | No | N/A |

## Channels

```typescript
enum NotificationChannel {
  IN_APP = 'IN_APP',    // WebSocket (always works)
  EMAIL = 'EMAIL',       // Email service (respects preferences)
  PUSH = 'PUSH',        // Future: Firebase/OneSignal
  SMS = 'SMS'           // Future: Twilio/SNS
}
```

## User Operations

```typescript
// Get unread count
const count = await notificationService.getUnreadCount(userId);

// Mark as read
await notificationService.markAsRead(notificationId, userId);
await notificationService.markMultipleAsRead([id1, id2], userId);
await notificationService.markAllAsRead(userId);

// Delete
await notificationService.deleteNotification(notificationId, userId);
await notificationService.deleteMultiple([id1, id2], userId);
await notificationService.deleteAll(userId);
await notificationService.deleteByType(userId, NotificationType.SYSTEM);

// Preferences
const prefs = await notificationService.getUserPreferences(userId);
await notificationService.updateUserPreferences(userId, { email: { enabled: true } });

// Stats
const stats = await notificationService.getNotificationStats(userId);
```

## Bulk Operations

```typescript
// Create for multiple users
await notificationService.createBulkNotifications({
  recipients: [userId1, userId2, userId3],
  type: NotificationType.SYSTEM,
  titleTemplate: 'Title {{var}}',
  contentTemplate: 'Content {{var}}',
  data: { var: 'value' }
});
```

## Template Variables

```typescript
// Use {{variableName}} in templates
await notificationService.createFromTemplate(userId, NotificationType.INVESTMENT, {
  startupName: 'TechCo',
  amount: 50000,
  investmentId: 'inv_123'
});

// Template: "Investment in {{startupName}}"
// Result: "Investment in TechCo"
```

## API Endpoints

### User Endpoints
- `GET /api/notifications` - List (supports filters, pagination)
- `GET /api/notifications/:id` - Get by ID
- `PUT /api/notifications/mark-read` - Mark as read
- `PUT /api/notifications/mark-all-read` - Mark all as read
- `DELETE /api/notifications/:id` - Delete
- `POST /api/notifications/bulk-action` - Bulk operations
- `GET /api/notifications/preferences` - Get preferences
- `PUT /api/notifications/preferences` - Update preferences
- `POST /api/notifications/test` - Send test
- `GET /api/notifications/summary` - Get summary

### Admin Endpoints
- `POST /api/notifications` - Create (admin)
- `POST /api/notifications/template` - Create template (admin)
- `GET /api/notifications/analytics` - Analytics (admin)

## Query Filters

```typescript
GET /api/notifications?isRead=false&type=INVESTMENT&priority=HIGH&page=1&limit=20
```

| Filter | Type | Description |
|--------|------|-------------|
| `isRead` | boolean | Filter by read status |
| `type` | NotificationType | Filter by type |
| `priority` | NotificationPriority | Filter by priority |
| `search` | string | Search title/content |
| `startDate` | ISO date | From date |
| `endDate` | ISO date | To date |
| `page` | number | Page number (default: 1) |
| `limit` | number | Per page (default: 20) |
| `sortBy` | string | Sort field (default: createdAt) |
| `sortOrder` | asc/desc | Sort order (default: desc) |

## User Preferences Structure

```typescript
{
  email: {
    enabled: boolean,
    frequency: 'IMMEDIATE' | 'DAILY' | 'WEEKLY',
    types: NotificationType[]
  },
  push: {
    enabled: boolean,
    types: NotificationType[]
  },
  inApp: {
    enabled: boolean,
    showBadge: boolean,
    soundEnabled: boolean,
    types: NotificationType[]
  },
  quietHours: {
    enabled: boolean,
    startTime: 'HH:MM',
    endTime: 'HH:MM',
    timezone: string,
    daysOfWeek: number[] // 0=Sunday, 6=Saturday
  }
}
```

## Error Handling Pattern

```typescript
try {
  await notificationService.createInvestmentNotification(userId, data);
} catch (error) {
  // Don't fail main operation if notification fails
  logger.error('Notification failed', { error, userId });
  // Continue...
}
```

## Performance Tips

1. **Use bulk operations** for multiple users
2. **Cache unread counts** (5 min TTL)
3. **Clean up expired** notifications daily
4. **Use pagination** for lists
5. **Use helper methods** instead of generic create

## Common Patterns

### After Creating a Resource
```typescript
const investment = await createInvestment(data);
await notificationService.createInvestmentNotification(userId, {
  investmentId: investment.id,
  // ... other data
});
```

### Webhook Handler
```typescript
app.post('/webhook', async (req, res) => {
  const event = req.body;
  // Process event...
  await notificationService.createPaymentNotification(userId, {
    // ... payment data
  });
  res.json({ received: true });
});
```

### Background Job
```typescript
worker.process(async (job) => {
  const { userIds, data } = job.data;
  await notificationService.createBulkNotifications({
    recipients: userIds,
    // ... notification data
  });
});
```

## Debugging Checklist

- [ ] Check user preferences: `getUserPreferences(userId)`
- [ ] Verify WebSocket connection
- [ ] Check quiet hours (only HIGH priority bypasses)
- [ ] Review logs: Winston outputs to console/files
- [ ] Test with `/api/notifications/test` endpoint
- [ ] Verify email service is configured

## Maintenance Tasks

### Daily Cron Job
```typescript
cron.schedule('0 2 * * *', async () => {
  // Clean up expired notifications
  await notificationService.cleanupExpiredNotifications();

  // Delete old read notifications (90+ days)
  await prisma.notification.deleteMany({
    where: {
      isRead: true,
      readAt: { lte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
    }
  });
});
```

## Testing

```typescript
// Send test notification
await notificationService.createTestNotification(userId, {
  type: NotificationType.INVESTMENT,
  channel: 'EMAIL',
  title: 'Test Notification',
  content: 'Testing notification delivery'
});
```

## Key Features

✅ Multi-channel delivery (In-App, Email, Push/SMS ready)
✅ User preferences with quiet hours
✅ Priority-based routing
✅ Automatic deduplication (5-min window)
✅ Template system with variables
✅ Bulk operations
✅ Real-time WebSocket delivery
✅ HTML email templates
✅ Comprehensive analytics
✅ Type-safe with TypeScript
✅ Full error handling

## Support

- **Logs**: Check Winston logger output
- **Database**: Use Prisma Studio to inspect notifications
- **WebSocket**: Check user connections in WebSocket service
- **Email**: Verify email service configuration

---

**Last Updated**: 2025-11-15
**Version**: 1.0.0
**Status**: Production Ready
