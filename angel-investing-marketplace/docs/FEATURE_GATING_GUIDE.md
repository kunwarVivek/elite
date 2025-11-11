# Feature Gating Guide

This guide explains how to protect premium features and enforce usage limits using our subscription-based feature gating system.

## Table of Contents

1. [Overview](#overview)
2. [Backend - Protecting Routes](#backend---protecting-routes)
3. [Frontend - Checking Access](#frontend---checking-access)
4. [Upgrade Prompts](#upgrade-prompts)
5. [Available Features & Limits](#available-features--limits)
6. [Examples](#examples)

## Overview

Our feature gating system has three layers:

1. **Backend Middleware** - Enforces access control and usage limits on API routes
2. **Frontend Integration** - Checks access before showing UI elements
3. **Upgrade Prompts** - Shows users what they need to upgrade for

### Architecture

```
User Request
     ↓
[Frontend Check] → Show/Hide UI elements
     ↓
[API Request]
     ↓
[Feature Gate Middleware] → Check subscription
     ↓
[Usage Limit Middleware] → Check limits
     ↓
[Controller Logic] → Process request
     ↓
[Track Usage Middleware] → Update counters
```

## Backend - Protecting Routes

### Import Middleware

```typescript
import {
  featureGate,
  usageLimit,
  trackUsageAfter,
  requireTier,
  combineGates
} from '../middleware/feature-gate.middleware.js';
```

### 1. Feature Gate - Check if Feature is Available

Blocks access if user's plan doesn't include the feature.

```typescript
// Single feature check
router.post(
  '/safes',
  authenticate,
  featureGate('safeAgreements'),
  safeController.createSafe
);
```

**Response if blocked (403):**
```json
{
  "error": "Feature not available",
  "message": "Your current plan doesn't include access to safeAgreements. Please upgrade to unlock this feature.",
  "feature": "safeAgreements",
  "upgradeRequired": true
}
```

### 2. Usage Limit - Enforce Quantitative Limits

Blocks access if user has reached their usage limit.

```typescript
// Check usage limit before allowing action
router.post(
  '/safes',
  authenticate,
  usageLimit('investments'),
  safeController.createSafe,
  trackUsageAfter('investments', 1)
);
```

**Response if blocked (403):**
```json
{
  "error": "Usage limit reached",
  "message": "You've reached your investments limit (5/5). Please upgrade your plan for unlimited access.",
  "limitName": "investments",
  "current": 5,
  "limit": 5,
  "upgradeRequired": true
}
```

### 3. Require Tier - Minimum Subscription Level

Blocks access if user's tier is below required level.

```typescript
// Require Growth tier or higher
router.post(
  '/waterfall',
  authenticate,
  requireTier('GROWTH'),
  waterfallController.calculate
);
```

Tier hierarchy: FREE < PRO < GROWTH < ENTERPRISE

**Response if blocked (403):**
```json
{
  "error": "Insufficient subscription tier",
  "message": "This feature requires at least a GROWTH subscription. You are currently on PRO.",
  "minimumTier": "GROWTH",
  "currentTier": "PRO",
  "upgradeRequired": true
}
```

### 4. Track Usage - Record Activity

Automatically increments usage counters after successful operations.

```typescript
router.post(
  '/documents/upload',
  authenticate,
  usageLimit('documents'),
  usageLimit('documentStorageMB'),
  documentController.upload,
  trackUsageAfter('documents', 1)  // Increment by 1
);
```

**Note:** Usage tracking is non-blocking. If tracking fails, the request still succeeds.

### 5. Combine Multiple Gates

Chain multiple checks together.

```typescript
router.post(
  '/api-call',
  authenticate,
  combineGates(
    requireTier('GROWTH'),
    featureGate('apiAccess'),
    usageLimit('apiCallsPerMonth')
  ),
  apiController.handleRequest,
  trackUsageAfter('apiCallsPerMonth', 1)
);
```

### Complete Example

```typescript
// routes/safe.routes.ts
import express from 'express';
import { safeController } from '../controllers/safe.controller.js';
import { authenticate } from '../middleware/auth.js';
import { featureGate, usageLimit, trackUsageAfter } from '../middleware/feature-gate.middleware.js';

const router = express.Router();

router.use(authenticate);

// Create SAFE - requires Pro tier, counts toward investment limit
router.post(
  '/',
  featureGate('safeAgreements'),       // Check feature access
  usageLimit('investments'),            // Check if under limit
  safeController.createSafe,            // Process request
  trackUsageAfter('investments', 1)     // Track usage
);

// Convert SAFE - requires feature access only
router.post(
  '/:id/convert',
  featureGate('safeAgreements'),
  safeController.convertSafe
);

export default router;
```

## Frontend - Checking Access

### 1. Import Hooks

```typescript
import {
  useIsFeatureAvailable,
  useCanPerformAction,
  useSubscriptionStatus
} from '@/stores/subscription-store';
import {
  useUpgradePrompt,
  shouldShowUpgradePrompt
} from '@/components/subscription/UpgradePrompt';
```

### 2. Check Feature Access

```typescript
function CreateSAFEButton() {
  const checkFeature = useIsFeatureAvailable('safeAgreements');
  const { showUpgradePrompt, UpgradePromptComponent } = useUpgradePrompt();
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkFeature().then(setHasAccess);
  }, []);

  const handleClick = async () => {
    if (!hasAccess) {
      showUpgradePrompt({
        reason: 'feature',
        featureName: 'safeAgreements',
        requiredTier: 'PRO'
      });
      return;
    }

    // Proceed with SAFE creation
    try {
      await createSAFE(data);
    } catch (error) {
      // Check if error is upgrade-related
      const upgrade = shouldShowUpgradePrompt(error);
      if (upgrade.show) {
        showUpgradePrompt(upgrade.props!);
      }
    }
  };

  return (
    <>
      <Button onClick={handleClick} disabled={!hasAccess}>
        Create SAFE
        {!hasAccess && <Lock className="ml-2 h-4 w-4" />}
      </Button>
      <UpgradePromptComponent />
    </>
  );
}
```

### 3. Check Usage Limits

```typescript
function InvestmentTracker() {
  const checkLimit = useCanPerformAction('investments');
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    checkLimit().then(setCanCreate);
  }, []);

  if (!canCreate) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Investment Limit Reached</AlertTitle>
        <AlertDescription>
          You've reached your investment tracking limit.{' '}
          <Link to="/pricing">Upgrade for unlimited tracking</Link>
        </AlertDescription>
      </Alert>
    );
  }

  return <CreateInvestmentForm />;
}
```

### 4. Show Subscription Status

```typescript
function SubscriptionBanner() {
  const status = useSubscriptionStatus();

  if (status.isTrialing && status.daysLeftInTrial) {
    return (
      <Banner variant="info">
        {status.daysLeftInTrial} days left in your trial.
        <Link to="/subscription">Add payment method</Link>
      </Banner>
    );
  }

  if (status.isPastDue) {
    return (
      <Banner variant="error">
        Your payment failed. Please update your payment method.
      </Banner>
    );
  }

  return null;
}
```

## Upgrade Prompts

### Auto-Show on API Errors

```typescript
import { shouldShowUpgradePrompt } from '@/components/subscription/UpgradePrompt';

async function createInvestment() {
  try {
    await api.post('/investments', data);
  } catch (error) {
    const upgrade = shouldShowUpgradePrompt(error);

    if (upgrade.show) {
      showUpgradePrompt(upgrade.props!);
    } else {
      // Handle other errors
      toast.error('Failed to create investment');
    }
  }
}
```

### Manual Trigger

```typescript
function FeatureCard() {
  const { showUpgradePrompt, UpgradePromptComponent } = useUpgradePrompt();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Waterfall Analysis</CardTitle>
          <Badge>Growth Plan</Badge>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => showUpgradePrompt({
              reason: 'feature',
              featureName: 'waterfallAnalysis',
              requiredTier: 'GROWTH'
            })}
          >
            Unlock Feature
          </Button>
        </CardContent>
      </Card>
      <UpgradePromptComponent />
    </>
  );
}
```

## Available Features & Limits

### Features (Boolean Access)

| Feature | Free | Pro | Growth | Enterprise |
|---------|------|-----|--------|------------|
| `browsDeals` | ✅ | ✅ | ✅ | ✅ |
| `investmentTracking` | ✅ | ✅ | ✅ | ✅ |
| `safeAgreements` | ❌ | ✅ | ✅ | ✅ |
| `convertibleNotes` | ❌ | ✅ | ✅ | ✅ |
| `capTableManagement` | ❌ | ✅ | ✅ | ✅ |
| `dilutionCalculator` | ❌ | ✅ | ✅ | ✅ |
| `waterfallAnalysis` | ❌ | ❌ | ✅ | ✅ |
| `termSheetTemplates` | ❌ | ✅ | ✅ | ✅ |
| `portfolioAnalytics` | ❌ | ✅ | ✅ | ✅ |
| `apiAccess` | ❌ | ❌ | ✅ | ✅ |
| `prioritySupport` | ❌ | ❌ | ✅ | ✅ |

### Limits (Quantitative)

| Limit | Free | Pro | Growth | Enterprise |
|-------|------|-----|--------|------------|
| `investments` | 5 | ∞ | ∞ | ∞ |
| `documents` | 10 | 500 | 2000 | ∞ |
| `documentStorageMB` | 100 | 5120 | 51200 | ∞ |
| `termSheetsPerYear` | 0 | 3 | ∞ | ∞ |
| `apiCallsPerMonth` | 0 | 0 | 1000 | ∞ |
| `teamMembers` | 1 | 1 | 5 | ∞ |

**Note:** `-1` or `∞` means unlimited.

## Examples

### Example 1: SAFE Agreement Creation

**Backend:**
```typescript
router.post(
  '/safes',
  authenticate,
  featureGate('safeAgreements'),      // Pro+
  usageLimit('investments'),           // Check limit
  safeController.createSafe,
  trackUsageAfter('investments', 1)    // Track
);
```

**Frontend:**
```typescript
const handleCreateSAFE = async () => {
  // Check access first
  if (!await checkFeature('safeAgreements')) {
    showUpgradePrompt({
      reason: 'feature',
      featureName: 'safeAgreements',
      requiredTier: 'PRO'
    });
    return;
  }

  // Check limit
  if (!await canPerformAction('investments')) {
    showUpgradePrompt({
      reason: 'limit',
      limitName: 'investments',
      requiredTier: 'PRO'
    });
    return;
  }

  // Create SAFE
  try {
    await createSAFE(formData);
    toast.success('SAFE created successfully');
  } catch (error) {
    handleAPIError(error);
  }
};
```

### Example 2: Waterfall Analysis (Growth Tier)

**Backend:**
```typescript
router.post(
  '/waterfall',
  authenticate,
  requireTier('GROWTH'),                    // Must be Growth+
  featureGate('waterfallAnalysis'),         // Extra check
  waterfallController.calculate
);
```

**Frontend:**
```typescript
const WaterfallButton = () => {
  const status = useSubscriptionStatus();
  const tier = useCurrentSubscription()?.plan.tier;

  if (tier !== 'GROWTH' && tier !== 'ENTERPRISE') {
    return (
      <Button disabled>
        <Lock className="mr-2 h-4 w-4" />
        Waterfall Analysis (Growth Plan)
      </Button>
    );
  }

  return <Button onClick={calculateWaterfall}>Calculate Waterfall</Button>;
};
```

### Example 3: Document Upload with Storage Limit

**Backend:**
```typescript
router.post(
  '/documents/upload',
  authenticate,
  usageLimit('documents'),              // Check document count
  usageLimit('documentStorageMB'),      // Check storage space
  upload.single('file'),
  documentController.upload,
  trackUsageAfter('documents', 1)       // Track document count
);
```

**Frontend:**
```typescript
const handleUpload = async (file: File) => {
  // Check document limit
  const docLimit = await checkUsageLimit('documents');
  if (!docLimit.allowed) {
    showUpgradePrompt({
      reason: 'limit',
      limitName: 'documents',
      currentLimit: docLimit.limit,
      currentUsage: docLimit.current,
      requiredTier: 'PRO'
    });
    return;
  }

  // Check storage limit
  const storageLimit = await checkUsageLimit('documentStorageMB');
  if (!storageLimit.allowed) {
    showUpgradePrompt({
      reason: 'limit',
      limitName: 'documentStorageMB',
      currentLimit: storageLimit.limit,
      currentUsage: storageLimit.current,
      requiredTier: 'PRO'
    });
    return;
  }

  // Upload
  await uploadDocument(file);
};
```

## Best Practices

1. **Always check on backend** - Frontend checks are for UX only. Backend enforces security.

2. **Check before API calls** - Prevent unnecessary API calls by checking access first.

3. **Show clear upgrade paths** - Use upgrade prompts to guide users to the right plan.

4. **Track usage accurately** - Use `trackUsageAfter` middleware consistently.

5. **Handle API errors gracefully** - Use `shouldShowUpgradePrompt` to detect upgrade-related errors.

6. **Test edge cases**:
   - User at exactly their limit
   - User switches plans mid-session
   - Trial expiry scenarios
   - Payment failures

7. **Cache sparingly** - Subscription status can change, don't cache for too long.

## Troubleshooting

### Feature gate not working

**Check:**
1. Middleware imported correctly
2. Feature name matches seed data
3. Subscription is active/trialing
4. User is authenticated

### Usage not being tracked

**Check:**
1. `trackUsageAfter` is after controller
2. Controller doesn't throw errors
3. Usage counter name matches limits

### Frontend shows wrong status

**Check:**
1. Subscription store is fetched
2. Token is valid
3. API endpoints are correct
4. No caching issues

## Support

For questions or issues:
- Check `/docs/IMPLEMENTATION_STATUS.md` for current status
- Review `/docs/DATABASE_SETUP.md` for database setup
- Contact dev team for feature gate additions

---

**Remember:** Feature gates protect your revenue. Always test thoroughly!
