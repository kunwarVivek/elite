# Database Setup Guide

## Prerequisites

- PostgreSQL database running
- Backend `.env` file configured with `DATABASE_URL`
- Node.js and npm installed

## Step 1: Run Database Migration

This will create all the subscription tables in your database.

```bash
cd backend

# Generate Prisma client (if not done already)
npx prisma generate

# Run migrations to create tables
npx prisma migrate dev --name add_subscription_models

# This will:
# - Create SubscriptionPlan table
# - Create Subscription table
# - Create SubscriptionUsage table
# - Create Invoice table
# - Create PaymentMethod table
# - Add subscription relations to User table
```

**Expected Output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "angel_investing_marketplace"

Running migration: 20250111000000_add_subscription_models

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20250111000000_add_subscription_models/
    └─ migration.sql

✔ Generated Prisma Client
```

## Step 2: Seed Subscription Plans

This will populate the database with 6 pre-configured subscription plans.

```bash
cd backend

# Run the seed script
npx ts-node prisma/seeds/subscription-plans.seed.ts
```

**Expected Output:**
```
Seeding subscription plans...
✅ Subscription plans seeded successfully
Created plans: Free, Investor Pro, Investor Pro, Founder Growth, Founder Growth, Enterprise
```

**Plans Created:**
1. **Free** - $0/month (no trial)
2. **Investor Pro Monthly** - $49/month (14-day trial)
3. **Investor Pro Annual** - $39/month billed annually (14-day trial)
4. **Founder Growth Monthly** - $199/month (14-day trial)
5. **Founder Growth Annual** - $159/month billed annually (14-day trial)
6. **Enterprise** - $999/month (30-day trial)

## Step 3: Verify Setup

Check that everything was created correctly:

```bash
cd backend

# Open Prisma Studio to view data
npx prisma studio
```

Navigate to:
- `SubscriptionPlan` table - should show 6 plans
- Verify features and limits are populated (JSON fields)

## Step 4: Test Subscription Creation (Optional)

Create a test subscription via the API:

```bash
# Replace with actual user ID and plan ID from database
curl -X POST http://localhost:3001/api/subscriptions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "planId": "PLAN_ID_FROM_DATABASE"
  }'
```

## Troubleshooting

### Migration Fails

**Issue:** `Error: P3009 - Migration failed to apply`

**Solution:**
1. Check PostgreSQL is running: `psql -U postgres -l`
2. Verify DATABASE_URL in `.env`
3. Try resetting database (⚠️ This deletes all data):
   ```bash
   npx prisma migrate reset
   npx prisma migrate dev --name add_subscription_models
   ```

### Seed Script Fails

**Issue:** `PrismaClientKnownRequestError: Unique constraint failed`

**Solution:** Plans already exist. The seed script uses `upsert`, so run it again - it will update existing plans.

**Issue:** `Cannot find module 'ts-node'`

**Solution:**
```bash
npm install -D ts-node @types/node
```

### Connection Refused

**Issue:** `Error: Can't reach database server`

**Solution:**
1. Start PostgreSQL: `brew services start postgresql` (macOS) or `sudo service postgresql start` (Linux)
2. Create database if it doesn't exist:
   ```bash
   psql -U postgres
   CREATE DATABASE angel_investing_marketplace;
   \q
   ```

## Next Steps

After successful setup:

1. ✅ Start backend server: `npm run dev`
2. ✅ Test subscription endpoints with Postman/Insomnia
3. ✅ Integrate Stripe payment processing
4. ✅ Apply feature gates to existing routes
5. ✅ Test onboarding flow end-to-end

## Database Schema Overview

```
┌─────────────────────┐
│ User                │
├─────────────────────┤
│ + subscriptions     │───┐
│ + paymentMethods    │   │
└─────────────────────┘   │
                          │
                          ▼
┌─────────────────────────────────────┐
│ Subscription                        │
├─────────────────────────────────────┤
│ - status (TRIALING, ACTIVE, etc.)   │
│ - currentPeriodStart/End            │
│ - stripeSubscriptionId              │
│ + plan                              │───┐
│ + usage                             │   │
│ + invoices                          │   │
└─────────────────────────────────────┘   │
                                          │
                                          ▼
┌─────────────────────────────────┐   ┌──────────────────┐
│ SubscriptionPlan                │   │ SubscriptionUsage│
├─────────────────────────────────┤   ├──────────────────┤
│ - name, tier, price             │   │ - investments    │
│ - features (JSON)               │   │ - documents      │
│ - limits (JSON)                 │   │ - storage        │
│ - stripePriceId                 │   │ - apiCalls       │
└─────────────────────────────────┘   └──────────────────┘
```

## Useful Prisma Commands

```bash
# View database schema
npx prisma db pull

# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# View database in browser
npx prisma studio

# Generate Prisma Client after schema changes
npx prisma generate

# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations in production
npx prisma migrate deploy
```

## Environment Variables

Make sure your `.env` has:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/angel_investing_marketplace?schema=public"

# Stripe (add when ready)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

## Success Checklist

- [ ] Database migration completed without errors
- [ ] 6 subscription plans seeded
- [ ] Can view plans in Prisma Studio
- [ ] Backend server starts successfully
- [ ] Can create test subscription via API
- [ ] Ready to integrate Stripe

---

**Need Help?** Check the troubleshooting section or review the Prisma docs: https://www.prisma.io/docs
