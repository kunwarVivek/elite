import { betterAuth } from 'better-auth';
import { prisma } from './database.js';
import { env } from './environment.js';
import { logger } from './logger.js';

// Better-Auth configuration
export const auth = betterAuth({
  database: prisma,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,

  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      // TODO: Send password reset email via queue
      logger.info('Password reset requested', { userId: user.id, url });
    },
  },

  // Social authentication providers
  socialProviders: {
    google: env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    } : undefined,

    github: env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET ? {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    } : undefined,
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  // Account management
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google', 'github'],
    },
  },

  // User management (deletion feature can be added later if needed)

  // Database hooks for logging
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          logger.info('User created', { userId: user.id, email: user.email });
        },
      },
      update: {
        after: async (user) => {
          logger.info('User updated', { userId: user.id });
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          logger.debug('Session created', { sessionId: session.id, userId: session.userId });
        },
      },
    },
  },

  // Advanced settings
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain: env.NODE_ENV === 'production' ? '.yourdomain.com' : undefined,
    },
  },

  // Rate limiting for auth endpoints
  rateLimit: {
    window: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
  },
});

// Type exports for Better-Auth
export type Auth = typeof auth;

// Helper functions for authentication
export const getUserFromSession = async (sessionId: string) => {
  try {
    const session = await prisma.session.findUnique({
      where: { sessionToken: sessionId },
      include: { user: true },
    });

    if (!session || session.expires < new Date()) {
      return null;
    }

    return session.user;
  } catch (error) {
    logger.error('Failed to get user from session', { sessionId, error });
    return null;
  }
};

export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const hashPassword = async (password: string): Promise<string> => {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(password, hash);
};

export default auth;