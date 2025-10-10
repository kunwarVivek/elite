import { PrismaClient } from '@prisma/client';
import { testPrisma } from '../setup';

export class TestFactory {
  constructor(private prisma: PrismaClient = testPrisma) {}

  // User factories
  async createUser(overrides = {}) {
    const defaultUser = {
      id: 'user_' + Math.random().toString(36).substr(2, 9),
      email: `user${Math.random().toString(36).substr(2, 9)}@example.com`,
      name: 'Test User',
      role: 'INVESTOR',
      is_verified: true,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };

    return this.prisma.user.create({ data: defaultUser });
  }

  async createFounder(overrides = {}) {
    return this.createUser({
      role: 'FOUNDER',
      name: 'Test Founder',
      ...overrides
    });
  }

  async createAdmin(overrides = {}) {
    return this.createUser({
      role: 'ADMIN',
      name: 'Test Admin',
      is_verified: true,
      ...overrides
    });
  }

  // Startup factories
  async createStartup(founderId: string, overrides = {}) {
    const defaultStartup = {
      id: 'startup_' + Math.random().toString(36).substr(2, 9),
      name: 'Test Startup Inc',
      slug: 'test-startup-' + Math.random().toString(36).substr(2, 9),
      description: 'A test startup for testing purposes',
      industry: 'Technology',
      stage: 'MVP',
      funding_goal: 500000,
      current_funding: 0,
      founder_id: founderId,
      is_verified: false,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };

    return this.prisma.startup.create({ data: defaultStartup });
  }

  // Pitch factories
  async createPitch(startupId: string, overrides = {}) {
    const defaultPitch = {
      id: 'pitch_' + Math.random().toString(36).substr(2, 9),
      startup_id: startupId,
      title: 'Test Investment Pitch',
      summary: 'A great investment opportunity',
      funding_amount: 500000,
      equity_offered: 10,
      minimum_investment: 10000,
      status: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };

    return this.prisma.pitch.create({ data: defaultPitch });
  }

  // Investment factories
  async createInvestment(investorId: string, pitchId: string, overrides = {}) {
    const defaultInvestment = {
      id: 'investment_' + Math.random().toString(36).substr(2, 9),
      investor_id: investorId,
      pitch_id: pitchId,
      amount: 25000,
      equity_percentage: 0.5,
      status: 'PENDING',
      investment_type: 'DIRECT',
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };

    return this.prisma.investment.create({ data: defaultInvestment });
  }

  // Transaction factories
  async createTransaction(investmentId: string, userId: string, overrides = {}) {
    const defaultTransaction = {
      id: 'transaction_' + Math.random().toString(36).substr(2, 9),
      investment_id: investmentId,
      user_id: userId,
      type: 'INVESTMENT',
      amount: 25000,
      status: 'COMPLETED',
      payment_method: 'BANK_TRANSFER',
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };

    return this.prisma.transaction.create({ data: defaultTransaction });
  }

  // Message factories
  async createMessage(senderId: string, receiverId: string, overrides = {}) {
    const defaultMessage = {
      id: 'message_' + Math.random().toString(36).substr(2, 9),
      sender_id: senderId,
      receiver_id: receiverId,
      content: 'Test message content',
      is_read: false,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };

    return this.prisma.message.create({ data: defaultMessage });
  }

  // Document factories
  async createDocument(startupId: string, overrides = {}) {
    const defaultDocument = {
      id: 'document_' + Math.random().toString(36).substr(2, 9),
      startup_id: startupId,
      name: 'Test Document.pdf',
      file_path: '/test/test-document.pdf',
      file_url: 'https://cdn.example.com/test-document.pdf',
      file_type: 'PITCH_DECK',
      file_size: 1024000,
      is_public: true,
      uploaded_by: startupId,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };

    return this.prisma.document.create({ data: defaultDocument });
  }

  // Notification factories
  async createNotification(userId: string, overrides = {}) {
    const defaultNotification = {
      id: 'notification_' + Math.random().toString(36).substr(2, 9),
      user_id: userId,
      type: 'INVESTMENT_UPDATE',
      title: 'Test Notification',
      content: 'This is a test notification',
      is_read: false,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };

    return this.prisma.notification.create({ data: defaultNotification });
  }

  // Cleanup utilities
  async cleanup() {
    const tables = [
      'notifications',
      'documents',
      'comments',
      'messages',
      'transactions',
      'investments',
      'pitches',
      'startups',
      'user_profiles',
      'users'
    ];

    for (const table of tables) {
      await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE ${table} CASCADE`);
    }
  }
}

// Export singleton instance
export const testFactory = new TestFactory();