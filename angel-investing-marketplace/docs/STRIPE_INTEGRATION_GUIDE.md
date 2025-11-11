# Stripe Payment Integration Guide

Complete guide for integrating Stripe payment processing into the Angel Investing Marketplace subscription system.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [Webhook Configuration](#webhook-configuration)
7. [Testing](#testing)
8. [Production Deployment](#production-deployment)
9. [Troubleshooting](#troubleshooting)

## Overview

The Stripe integration enables:
- **Subscription Management**: Create, update, and cancel subscriptions
- **Payment Collection**: Secure payment method storage with SetupIntents
- **Trial Management**: 14-day free trials for paid plans
- **Billing Portal**: Self-service subscription management for customers
- **Webhook Events**: Automatic sync between Stripe and database
- **Invoice Management**: Automated billing and payment receipts

### Architecture

```
Frontend (React)
    “ Payment Method
Stripe Elements
    “ SetupIntent
Backend API
    “ Create Subscription
Stripe API
    “ Webhook Events
Webhook Handler
    “ Update Database
PostgreSQL
```

## Prerequisites

### Required Accounts
- [Stripe Account](https://dashboard.stripe.com/register) (free to create)
- Stripe Test Mode credentials (for development)
- Stripe Live Mode credentials (for production)

### Required Packages

Backend:
```bash
cd backend
npm install stripe
```

Frontend:
```bash
cd frontend
npm install @stripe/stripe-js @stripe/react-stripe-js
```

## Environment Setup

### Backend Environment Variables

Add to `backend/.env`:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
STRIPE_PUBLISHABLE_KEY=pk_test_... # Your Stripe publishable key (for frontend)
STRIPE_WEBHOOK_SECRET=whsec_... # Your webhook signing secret

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:3000
```

### Frontend Environment Variables

Add to `frontend/.env.local`:

```bash
# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Getting Stripe Keys

1. **API Keys**:
   - Go to [Stripe Dashboard ’ Developers ’ API keys](https://dashboard.stripe.com/test/apikeys)
   - Copy "Publishable key" (pk_test_...) and "Secret key" (sk_test_...)

2. **Webhook Secret**:
   - Go to [Stripe Dashboard ’ Developers ’ Webhooks](https://dashboard.stripe.com/test/webhooks)
   - Click "Add endpoint"
   - Set URL: `https://your-domain.com/api/webhooks/stripe`
   - Select events (see [Webhook Configuration](#webhook-configuration))
   - Copy the "Signing secret" (whsec_...)

## Backend Implementation

### 1. Stripe Service (`backend/src/services/stripe.service.ts`)

The Stripe service handles all Stripe API interactions:

**Key Methods:**
- `createSetupIntent(customerId)` - Collect payment method
- `createSubscription(params)` - Create a subscription
- `cancelSubscription(subscriptionId, cancelAtPeriodEnd)` - Cancel subscription
- `createBillingPortalSession(customerId, returnUrl)` - Self-service portal
- `getUpcomingInvoice(subscriptionId)` - Preview next charge

### 2. Webhook Handler (`backend/src/controllers/webhook.controller.ts`)

Handles Stripe events and syncs with database:

**Events Handled:**
- `customer.subscription.created` - New subscription created
- `customer.subscription.updated` - Subscription changed
- `customer.subscription.deleted` - Subscription canceled
- `customer.subscription.trial_will_end` - Trial ending soon (3 days)
- `invoice.paid` - Payment successful
- `invoice.payment_failed` - Payment failed
- `invoice.upcoming` - Upcoming payment (7 days)
- `payment_method.attached` - Payment method added
- `payment_method.detached` - Payment method removed

### 3. Subscription Controller (`backend/src/controllers/subscription.controller.ts`)

New Stripe endpoints added:

**POST `/api/subscriptions/stripe/setup-intent`**
- Creates a SetupIntent for payment method collection
- Returns `clientSecret` for Stripe Elements
- Usage: Payment form initialization

**POST `/api/subscriptions/stripe/create`**
- Creates a subscription with trial
- Requires: `planId`, optional `paymentMethodId`
- Returns: Subscription details + client secret

**POST `/api/subscriptions/stripe/billing-portal`**
- Creates a billing portal session
- Returns: Portal URL for redirect
- Usage: Customer self-service

**GET `/api/subscriptions/stripe/upcoming-invoice`**
- Gets next invoice details
- Returns: Amount, period, due date

**GET `/api/subscriptions/stripe/payment-methods`**
- Lists customer's payment methods
- Returns: Card details (brand, last4, expiry)

### 4. Routes (`backend/src/routes/`)

**Webhook Routes** (`webhook.routes.ts`):
```typescript
POST /api/webhooks/stripe
GET /api/webhooks/stripe/health
```

**Subscription Routes** (`subscription.routes.ts`):
```typescript
POST /api/subscriptions/stripe/setup-intent
POST /api/subscriptions/stripe/create
POST /api/subscriptions/stripe/billing-portal
GET /api/subscriptions/stripe/upcoming-invoice
GET /api/subscriptions/stripe/payment-methods
```

## Frontend Implementation

### 1. Install Dependencies

```bash
cd frontend
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### 2. Initialize Stripe

Create `frontend/src/lib/stripe.ts`:

```typescript
import { loadStripe, Stripe } from '@stripe/stripe-js'

let stripePromise: Promise<Stripe | null>

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    if (!publishableKey) {
      throw new Error('Missing VITE_STRIPE_PUBLISHABLE_KEY')
    }
    stripePromise = loadStripe(publishableKey)
  }
  return stripePromise
}
```

### 3. Payment Form Component

Create `frontend/src/components/subscription/PaymentForm.tsx`:

```typescript
import React, { useState } from 'react'
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'

interface PaymentFormProps {
  onSuccess: () => void
  onError: (error: string) => void
}

export function PaymentForm({ onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)

    const { error } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/onboarding/success`,
      },
    })

    if (error) {
      onError(error.message || 'Payment failed')
      setIsProcessing(false)
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="mt-4 w-full"
      >
        {isProcessing ? 'Processing...' : 'Save Payment Method'}
      </Button>
    </form>
  )
}
```

### 4. Update Payment Page

Update `frontend/src/routes/onboarding/payment.tsx`:

```typescript
import React, { useState, useEffect } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { getStripe } from '@/lib/stripe'
import { PaymentForm } from '@/components/subscription/PaymentForm'
import { subscriptionApi } from '@/lib/subscription-api'

export function PaymentPage() {
  const [clientSecret, setClientSecret] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Create SetupIntent
    const createSetupIntent = async () => {
      try {
        const { clientSecret } = await subscriptionApi.createSetupIntent()
        setClientSecret(clientSecret)
      } catch (error) {
        console.error('Error creating setup intent:', error)
      } finally {
        setLoading(false)
      }
    }

    createSetupIntent()
  }, [])

  if (loading || !clientSecret) {
    return <div>Loading...</div>
  }

  return (
    <Elements stripe={getStripe()} options={{ clientSecret }}>
      <PaymentForm
        onSuccess={() => {
          // Create subscription
          window.location.href = '/onboarding/profile'
        }}
        onError={(error) => {
          console.error('Payment error:', error)
        }}
      />
    </Elements>
  )
}
```

### 5. Billing Portal Integration

Update subscription settings to use Stripe Billing Portal:

```typescript
// In subscription settings page
const handleManageBilling = async () => {
  try {
    const { url } = await subscriptionApi.createBillingPortalSession()
    window.location.href = url
  } catch (error) {
    console.error('Error opening billing portal:', error)
  }
}
```

### 6. Update Subscription API

Add to `frontend/src/lib/subscription-api.ts`:

```typescript
export const subscriptionApi = {
  // ... existing methods

  /**
   * Create a SetupIntent for payment method collection
   */
  async createSetupIntent(): Promise<{ clientSecret: string; setupIntentId: string }> {
    const response = await apiClient.post('/subscriptions/stripe/setup-intent')
    return response.data
  },

  /**
   * Create a subscription with Stripe
   */
  async createStripeSubscription(planId: string, paymentMethodId?: string): Promise<any> {
    const response = await apiClient.post('/subscriptions/stripe/create', {
      planId,
      paymentMethodId,
    })
    return response.data
  },

  /**
   * Create billing portal session
   */
  async createBillingPortalSession(returnUrl?: string): Promise<{ url: string }> {
    const response = await apiClient.post('/subscriptions/stripe/billing-portal', {
      returnUrl,
    })
    return response.data
  },

  /**
   * Get upcoming invoice
   */
  async getUpcomingInvoice(): Promise<any> {
    const response = await apiClient.get('/subscriptions/stripe/upcoming-invoice')
    return response.data.invoice
  },

  /**
   * List payment methods
   */
  async listPaymentMethods(): Promise<any[]> {
    const response = await apiClient.get('/subscriptions/stripe/payment-methods')
    return response.data.paymentMethods
  },
}
```

## Webhook Configuration

### 1. Local Development with Stripe CLI

Install Stripe CLI:
```bash
brew install stripe/stripe-cli/stripe  # macOS
# or
scoop install stripe  # Windows
```

Login to Stripe:
```bash
stripe login
```

Forward webhooks to local server:
```bash
stripe listen --forward-to localhost:5000/api/webhooks/stripe
```

This will output a webhook signing secret - add it to your `.env` file.

### 2. Production Webhook Setup

1. Go to [Stripe Dashboard ’ Developers ’ Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen to:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `invoice.upcoming`
   - `payment_method.attached`
   - `payment_method.detached`
   - `customer.updated`
5. Copy the signing secret and add to production environment variables

### 3. Verify Webhook

Test webhook endpoint:
```bash
curl -X POST http://localhost:5000/api/webhooks/stripe/health
```

Expected response:
```json
{
  "success": true,
  "message": "Stripe webhook endpoint is active",
  "timestamp": "2025-01-10T12:00:00.000Z"
}
```

## Testing

### 1. Test Payment Methods

Stripe provides test card numbers:

**Successful Payments:**
- `4242 4242 4242 4242` - Visa
- `5555 5555 5555 4444` - Mastercard
- Any future expiry date (e.g., 12/34)
- Any 3-digit CVC

**Failed Payments:**
- `4000 0000 0000 0002` - Card declined
- `4000 0000 0000 9995` - Insufficient funds

### 2. Test Subscription Flow

```bash
# 1. Create setup intent
curl -X POST http://localhost:5000/api/subscriptions/stripe/setup-intent \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 2. Create subscription
curl -X POST http://localhost:5000/api/subscriptions/stripe/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "PLAN_ID",
    "paymentMethodId": "pm_test_..."
  }'

# 3. Check subscription
curl -X GET http://localhost:5000/api/subscriptions/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Test Webhooks

Trigger test events in Stripe:
```bash
stripe trigger customer.subscription.created
stripe trigger invoice.paid
stripe trigger invoice.payment_failed
```

### 4. Test Billing Portal

```bash
curl -X POST http://localhost:5000/api/subscriptions/stripe/billing-portal \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"returnUrl": "http://localhost:3000/settings/subscription"}'
```

## Production Deployment

### 1. Checklist

- [ ] Switch to live Stripe API keys
- [ ] Update `STRIPE_SECRET_KEY` with live key (`sk_live_...`)
- [ ] Update `VITE_STRIPE_PUBLISHABLE_KEY` with live key (`pk_live_...`)
- [ ] Configure production webhook endpoint
- [ ] Enable Stripe Radar (fraud prevention)
- [ ] Set up billing portal branding
- [ ] Test complete subscription flow in test mode
- [ ] Verify webhook events are received
- [ ] Set up monitoring and alerts

### 2. Stripe Products & Prices

Create products and prices in Stripe Dashboard:

1. Go to [Products](https://dashboard.stripe.com/products)
2. Create products for each plan:
   - Investor Pro Monthly ($49/month)
   - Investor Pro Annual ($470/year)
   - Founder Growth Monthly ($199/month)
   - Founder Growth Annual ($1910/year)
3. Copy the Price IDs and update your subscription plans in database:

```sql
UPDATE subscription_plans
SET stripe_price_id = 'price_...'
WHERE name = 'Investor Pro' AND billing_interval = 'MONTHLY';
```

### 3. Security Best Practices

- **Never expose secret keys** - Keep `STRIPE_SECRET_KEY` server-side only
- **Verify webhook signatures** - Always validate `stripe-signature` header
- **Use HTTPS** - Stripe requires HTTPS for webhooks in production
- **Handle idempotency** - Webhook events may be sent multiple times
- **Log errors** - Monitor Stripe API errors and webhook failures

### 4. Monitoring

Set up alerts for:
- Failed payments
- Webhook failures
- Subscription cancellations
- Trial expirations without conversion

Use Stripe Dashboard:
- [Events & logs](https://dashboard.stripe.com/events)
- [Webhooks monitoring](https://dashboard.stripe.com/webhooks)
- [Payment success rate](https://dashboard.stripe.com/analytics/revenue)

## Troubleshooting

### Webhook Not Receiving Events

**Check 1:** Verify endpoint is accessible
```bash
curl https://yourdomain.com/api/webhooks/stripe/health
```

**Check 2:** Check webhook logs in Stripe Dashboard
- Go to Webhooks ’ Your endpoint ’ Attempted events
- Look for failed deliveries and error messages

**Check 3:** Verify signing secret is correct
- The `STRIPE_WEBHOOK_SECRET` must match the secret from Stripe Dashboard

**Check 4:** Check server logs for signature verification errors

### Payment Method Not Saving

**Issue:** SetupIntent succeeds but payment method not attached

**Solution:** Ensure you're calling `stripe.confirmSetup()` correctly:
```typescript
await stripe.confirmSetup({
  elements,
  confirmParams: {
    return_url: `${window.location.origin}/success`,
  },
})
```

### Subscription Not Created

**Check 1:** Verify plan has `stripePriceId` in database
**Check 2:** Ensure customer has default payment method
**Check 3:** Check Stripe Dashboard for subscription errors

### Trial Not Starting

**Issue:** Subscription created without trial period

**Cause:** Plan configuration missing trial settings

**Solution:** Verify plan in database:
```sql
SELECT name, trial, trial_days FROM subscription_plans;
```

Update if needed:
```sql
UPDATE subscription_plans
SET trial = true, trial_days = 14
WHERE tier = 'PRO';
```

### Invoice Payment Failed

**Common Causes:**
1. Insufficient funds
2. Card expired
3. Card declined by issuer

**Actions:**
1. Webhook sends `invoice.payment_failed` event
2. Update subscription status to `PAST_DUE`
3. Send email to customer
4. Stripe auto-retries according to retry schedule

**Configure Retry Schedule:**
- Go to [Settings ’ Billing](https://dashboard.stripe.com/settings/billing/automatic)
- Set smart retries (recommended)

### Database Out of Sync with Stripe

**Symptom:** Database shows different status than Stripe

**Solution:** Sync from Stripe
```typescript
// Get subscription from Stripe
const stripeSubscription = await StripeService.getSubscription(subscriptionId)

// Update database
await prisma.subscription.update({
  where: { stripeSubscriptionId: subscriptionId },
  data: {
    status: StripeService.mapStripeStatusToAppStatus(stripeSubscription.status),
    currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
    currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
  },
})
```

## Additional Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Subscriptions Guide](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Elements Documentation](https://stripe.com/docs/elements)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe Security](https://stripe.com/docs/security/guide)

## Support

For Stripe-related issues:
- [Stripe Support](https://support.stripe.com/)
- [Stripe Community](https://github.com/stripe)

For implementation issues:
- Check logs in `backend/logs/`
- Review Stripe Dashboard ’ Events
- Check webhook delivery status
