import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  // Authentication
  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_URL: z.string().url(),

  // OAuth Providers
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // File Storage
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),

  // Cloudflare R2 Storage
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().optional(),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().optional(),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // Frontend
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  // Socket.IO
  SOCKET_IO_CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Security
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),
  JWT_SECRET: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // File Upload
  MAX_FILE_SIZE: z.coerce.number().default(10 * 1024 * 1024), // 10MB
  ALLOWED_FILE_TYPES: z.string().default('image/jpeg,image/png,image/gif,image/webp,application/pdf'),

  // Monitoring
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Stripe Payment Processing
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Plaid Bank Integration
  PLAID_CLIENT_ID: z.string().optional(),
  PLAID_SECRET: z.string().optional(),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']).default('sandbox'),

  // Payment Configuration
  PLATFORM_FEE_PERCENTAGE: z.coerce.number().default(5),
  SYNDICATE_FEE_PERCENTAGE: z.coerce.number().default(3),
  MINIMUM_INVESTMENT_AMOUNT: z.coerce.number().default(100),
  MAXIMUM_INVESTMENT_AMOUNT: z.coerce.number().default(1000000),

  // Escrow Configuration
  ESCROW_HOLD_PERIOD_DAYS: z.coerce.number().default(30),
  REFUND_WINDOW_DAYS: z.coerce.number().default(7),

  // KYC/AML Configuration
  KYC_VERIFICATION_THRESHOLD: z.coerce.number().default(10000),
  AML_SCREENING_THRESHOLD: z.coerce.number().default(50000),
});

// Validate environment variables
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment variables:');
  parseResult.error.issues.forEach((issue) => {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parseResult.data;

// Export commonly used environment variables
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

export default env;