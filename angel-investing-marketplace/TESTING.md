# Payment Integration Testing Guide

## Overview

This document provides comprehensive testing instructions for the payment processing system implemented for the angel investing marketplace.

## Test Environment Setup

### 1. Environment Variables

Ensure all required environment variables are set in your `.env` file:

```bash
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Payment Configuration
PLATFORM_FEE_PERCENTAGE=5
SYNDICATE_FEE_PERCENTAGE=3
MINIMUM_INVESTMENT_AMOUNT=100
MAXIMUM_INVESTMENT_AMOUNT=1000000

# Database
DATABASE_URL=your_database_url

# Redis (for queues)
REDIS_URL=redis://localhost:6379
```

### 2. Database Setup

Run database migrations to ensure all payment-related tables exist:

```bash
cd backend
npm run db:migrate
```

### 3. Start Services

Start the backend server and Redis:

```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Start Backend
cd backend
npm run dev

# Terminal 3: Start Frontend
cd frontend
npm run dev
```

## Manual Testing Procedures

### 1. Payment Method Configuration

**Test Case:** Verify payment methods are properly configured

1. Navigate to: `GET /api/v1/payments/methods`
2. Expected Response:
   ```json
   {
     "methods": [
       {
         "id": "CARD",
         "name": "Credit/Debit Card",
         "fees": { "platform_fee": 50, "processing_fee": 29 },
         "limits": { "minimum": 1, "maximum": 100000 }
       }
     ]
   }
   ```

### 2. Fee Calculation

**Test Case:** Verify fee calculation accuracy

1. Request: `GET /api/v1/payments/fees/calculate?amount=1000&investment_type=DIRECT`
2. Expected Response:
   ```json
   {
     "investment_amount": 1000,
     "fees": {
       "platform_fee": 50,
       "processing_fee": 29,
       "total_fee": 79
     },
     "net_amount": 921
   }
   ```

### 3. Payment Processing Flow

**Test Case:** Complete payment processing with escrow

#### Step 1: Create Investment
```bash
curl -X POST http://localhost:3001/api/v1/investments \
  -H "Content-Type: application/json" \
  -d '{
    "pitchId": "pitch_123",
    "amount": 1000,
    "paymentMethod": "CARD",
    "investmentType": "DIRECT"
  }'
```

#### Step 2: Process Payment
```bash
curl -X POST http://localhost:3001/api/v1/payments/process \
  -H "Content-Type: application/json" \
  -d '{
    "investmentId": "investment_123",
    "amount": 1000,
    "paymentMethod": "CARD",
    "investmentType": "DIRECT"
  }'
```

#### Step 3: Verify Payment Status
```bash
curl -X GET http://localhost:3001/api/v1/payments/investment_123
```

### 4. Webhook Testing

**Test Case:** Test Stripe webhook handling

1. Use Stripe CLI to forward webhooks:
   ```bash
   stripe listen --forward-to localhost:3001/api/v1/payments/webhook/stripe
   ```

2. Trigger test webhook:
   ```bash
   stripe trigger payment_intent.succeeded
   ```

3. Verify webhook processing in server logs

### 5. Escrow Operations

**Test Case:** Test escrow creation and release

1. Create escrow for completed payment
2. Verify escrow status: `GET /api/v1/payments/{investmentId}`
3. Release escrow funds:
   ```bash
   curl -X POST http://localhost:3001/api/v1/payments/escrow/release \
     -H "Content-Type: application/json" \
     -d '{
       "escrowReference": "escrow_123",
       "releaseType": "AUTOMATIC"
     }'
   ```

### 6. Refund Processing

**Test Case:** Test refund functionality

```bash
curl -X POST http://localhost:3001/api/v1/payments/investment_123/refund \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "CHANGED_MIND",
    "amount": 500
  }'
```

### 7. Error Scenarios

**Test Case:** Test error handling and recovery

1. **Network Timeout:**
   - Simulate network interruption during payment
   - Verify retry mechanism triggers

2. **Invalid Payment Method:**
   ```bash
   curl -X POST http://localhost:3001/api/v1/payments/process \
     -d '{"paymentMethod": "INVALID"}'
   ```
   - Expected: Validation error response

3. **Insufficient Funds:**
   - Use test card that triggers insufficient funds
   - Verify proper error handling

## Automated Testing

### 1. Unit Tests

Run payment service unit tests:

```bash
cd backend
npm run test -- --testPathPattern=payment
```

### 2. Integration Tests

Run full payment flow integration tests:

```bash
cd backend
npm run test -- --testPathPattern=payment-integration
```

### 3. Load Testing

Test payment system under load:

```bash
# Using artillery
artillery run payment-load-test.yml
```

## Frontend Testing

### 1. Component Testing

Test payment components:

```bash
cd frontend
npm run test -- --testPathPattern=payment
```

### 2. E2E Testing

Run end-to-end payment flow tests:

```bash
cd frontend
npm run test:e2e -- --grep="payment"
```

## Monitoring and Debugging

### 1. Log Monitoring

Monitor payment-related logs:

```bash
# Backend logs
tail -f backend/logs/payment.log

# Queue processing logs
tail -f backend/logs/queue.log
```

### 2. Database Inspection

Check payment records in database:

```sql
-- Check investments
SELECT * FROM investments WHERE status = 'PENDING';

-- Check transactions
SELECT * FROM transactions WHERE type = 'INVESTMENT';

-- Check escrow records
SELECT * FROM escrow_accounts WHERE status = 'HELD';
```

### 3. Queue Monitoring

Monitor payment queue status:

```bash
# Get queue statistics
curl -X GET http://localhost:3001/api/v1/admin/queues/payment-processing/stats
```

## Common Issues and Solutions

### 1. Stripe Webhook Not Working

**Issue:** Webhooks not being processed
**Solution:**
- Verify webhook secret matches Stripe dashboard
- Check webhook endpoint URL is accessible
- Review Stripe CLI forwarding configuration

### 2. Payment Queue Backlog

**Issue:** Payment jobs stuck in queue
**Solution:**
- Check Redis connection
- Verify worker processes are running
- Review queue configuration

### 3. Database Connection Errors

**Issue:** Payment operations failing due to DB issues
**Solution:**
- Verify database connection string
- Check database server status
- Review connection pool configuration

## Performance Benchmarks

### Expected Performance Metrics

- **Payment Processing:** < 3 seconds
- **Webhook Processing:** < 1 second
- **Fee Calculation:** < 100ms
- **Queue Processing:** < 5 seconds
- **Error Recovery:** < 30 seconds

### Load Testing Results

Run load tests to verify:

```bash
# 100 concurrent payment requests
artillery run --config payment-load-test.json
```

Expected Results:
- 95% of payments complete within 5 seconds
- < 1% error rate
- Queue backlog < 10 items

## Security Testing

### 1. PCI Compliance Verification

- Verify no card data stored in logs
- Confirm encrypted data transmission
- Test payment data sanitization

### 2. Authentication Testing

- Test unauthorized access attempts
- Verify JWT token validation
- Test role-based access control

### 3. Input Validation

- Test SQL injection prevention
- Verify XSS protection
- Test payment amount limits

## Compliance Testing

### 1. KYC Verification

- Test KYC requirement triggers at correct thresholds
- Verify KYC provider integration
- Test KYC status updates

### 2. AML Screening

- Test AML checks for large transactions
- Verify screening provider integration
- Test false positive handling

## Troubleshooting Guide

### Debug Payment Failures

1. **Check Logs:**
   ```bash
   grep "payment" backend/logs/*.log | tail -20
   ```

2. **Verify Stripe Dashboard:**
   - Check payment intent status
   - Review webhook delivery
   - Verify API keys

3. **Test Database:**
   ```bash
   # Check for stuck transactions
   SELECT * FROM transactions WHERE status = 'PENDING' AND created_at < NOW() - INTERVAL '5 minutes';
   ```

### Common Error Codes

- `PAYMENT_DECLINED`: Card/payment method declined
- `INSUFFICIENT_FUNDS`: Insufficient account balance
- `VALIDATION_ERROR`: Invalid payment data
- `NETWORK_ERROR`: Connection/timeout issues
- `COMPLIANCE_ERROR`: KYC/AML check failed

## Success Criteria

✅ All payment methods functional
✅ Webhook processing reliable
✅ Escrow management operational
✅ Error recovery working
✅ Security measures in place
✅ Performance benchmarks met
✅ Compliance requirements satisfied

## Support Contacts

For payment system issues:
- Development Team: dev-team@company.com
- Payment Operations: payments@company.com
- Emergency: emergency@company.com