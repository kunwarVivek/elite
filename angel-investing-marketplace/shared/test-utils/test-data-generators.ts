import { faker } from '@faker-js/faker';

// Test data generators for consistent test data across the application

export interface TestUserData {
  id?: string;
  email: string;
  name: string;
  role: 'FOUNDER' | 'INVESTOR' | 'SYNDICATE_LEAD' | 'ADMIN';
  avatar_url?: string;
  is_verified?: boolean;
  profile_data?: any;
}

export interface TestStartupData {
  id?: string;
  name: string;
  slug?: string;
  description: string;
  industry: string;
  stage: 'IDEA' | 'PROTOTYPE' | 'MVP' | 'GROWTH' | 'SCALE';
  funding_goal: number;
  current_funding?: number;
  founder_id: string;
  is_verified?: boolean;
}

export interface TestPitchData {
  id?: string;
  startup_id: string;
  title: string;
  summary: string;
  funding_amount: number;
  equity_offered: number;
  minimum_investment: number;
  status?: 'DRAFT' | 'UNDER_REVIEW' | 'ACTIVE' | 'FUNDED' | 'CLOSED';
}

export interface TestInvestmentData {
  id?: string;
  investor_id: string;
  pitch_id: string;
  amount: number;
  equity_percentage: number;
  status?: 'PENDING' | 'ESCROW' | 'COMPLETED' | 'CANCELLED';
  investment_type?: 'DIRECT' | 'SYNDICATE';
}

export class TestDataGenerator {
  /**
   * Generate test user data
   */
  static generateUser(overrides: Partial<TestUserData> = {}): TestUserData {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const role = overrides.role || faker.helpers.arrayElement(['FOUNDER', 'INVESTOR', 'SYNDICATE_LEAD', 'ADMIN']);

    return {
      id: overrides.id || `user_${faker.string.alphanumeric(8)}`,
      email: overrides.email || faker.internet.email({ firstName, lastName }).toLowerCase(),
      name: overrides.name || `${firstName} ${lastName}`,
      role,
      avatar_url: overrides.avatar_url || faker.image.avatar(),
      is_verified: overrides.is_verified ?? faker.datatype.boolean(),
      profile_data: overrides.profile_data || {
        bio: faker.person.bio(),
        location: faker.location.city() + ', ' + faker.location.country(),
        linkedin_url: faker.internet.url(),
        investment_range_min: role === 'INVESTOR' ? faker.number.int({ min: 10000, max: 50000 }) : undefined,
        investment_range_max: role === 'INVESTOR' ? faker.number.int({ min: 100000, max: 1000000 }) : undefined,
      },
      ...overrides,
    };
  }

  /**
   * Generate multiple test users
   */
  static generateUsers(count: number, overrides: Partial<TestUserData> = {}): TestUserData[] {
    return Array.from({ length: count }, () => this.generateUser(overrides));
  }

  /**
   * Generate test startup data
   */
  static generateStartup(overrides: Partial<TestStartupData> = {}): TestStartupData {
    const companyName = faker.company.name();
    const industry = faker.helpers.arrayElement([
      'Technology', 'Healthcare', 'Fintech', 'E-commerce', 'SaaS', 'AI/ML', 'Blockchain', 'CleanTech'
    ]);

    return {
      id: overrides.id || `startup_${faker.string.alphanumeric(8)}`,
      name: overrides.name || companyName,
      slug: overrides.slug || companyName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      description: overrides.description || faker.company.catchPhrase(),
      industry,
      stage: overrides.stage || faker.helpers.arrayElement(['IDEA', 'PROTOTYPE', 'MVP', 'GROWTH', 'SCALE']),
      funding_goal: overrides.funding_goal || faker.number.int({ min: 100000, max: 5000000 }),
      current_funding: overrides.current_funding || 0,
      founder_id: overrides.founder_id || `user_${faker.string.alphanumeric(8)}`,
      is_verified: overrides.is_verified ?? faker.datatype.boolean(),
      ...overrides,
    };
  }

  /**
   * Generate multiple test startups
   */
  static generateStartups(count: number, overrides: Partial<TestStartupData> = {}): TestStartupData[] {
    return Array.from({ length: count }, () => this.generateStartup(overrides));
  }

  /**
   * Generate test pitch data
   */
  static generatePitch(overrides: Partial<TestPitchData> = {}): TestPitchData {
    const fundingAmount = faker.number.int({ min: 100000, max: 5000000 });
    const equityOffered = faker.number.float({ min: 5, max: 25, fractionDigits: 2 });

    return {
      id: overrides.id || `pitch_${faker.string.alphanumeric(8)}`,
      startup_id: overrides.startup_id || `startup_${faker.string.alphanumeric(8)}`,
      title: overrides.title || `Revolutionary ${faker.company.buzzPhrase()} Platform`,
      summary: overrides.summary || faker.company.catchPhrase(),
      funding_amount: fundingAmount,
      equity_offered: equityOffered,
      minimum_investment: overrides.minimum_investment || faker.number.int({ min: 1000, max: 25000 }),
      status: overrides.status || 'ACTIVE',
      ...overrides,
    };
  }

  /**
   * Generate multiple test pitches
   */
  static generatePitches(count: number, overrides: Partial<TestPitchData> = {}): TestPitchData[] {
    return Array.from({ length: count }, () => this.generatePitch(overrides));
  }

  /**
   * Generate test investment data
   */
  static generateInvestment(overrides: Partial<TestInvestmentData> = {}): TestInvestmentData {
    const amount = faker.number.int({ min: 10000, max: 100000 });
    const pitch = overrides.pitch_id ? {} : this.generatePitch();

    return {
      id: overrides.id || `investment_${faker.string.alphanumeric(8)}`,
      investor_id: overrides.investor_id || `user_${faker.string.alphanumeric(8)}`,
      pitch_id: overrides.pitch_id || pitch.id || `pitch_${faker.string.alphanumeric(8)}`,
      amount,
      equity_percentage: overrides.equity_percentage || faker.number.float({ min: 0.1, max: 5, fractionDigits: 2 }),
      status: overrides.status || faker.helpers.arrayElement(['PENDING', 'ESCROW', 'COMPLETED', 'CANCELLED']),
      investment_type: overrides.investment_type || 'DIRECT',
      ...overrides,
    };
  }

  /**
   * Generate multiple test investments
   */
  static generateInvestments(count: number, overrides: Partial<TestInvestmentData> = {}): TestInvestmentData[] {
    return Array.from({ length: count }, () => this.generateInvestment(overrides));
  }

  /**
   * Generate realistic test scenarios
   */
  static generateRealisticScenario() {
    const founder = this.generateUser({ role: 'FOUNDER' });
    const startup = this.generateStartup({ founder_id: founder.id });
    const pitch = this.generatePitch({ startup_id: startup.id });

    const investors = this.generateUsers(3, { role: 'INVESTOR' });
    const investments = investors.map(investor =>
      this.generateInvestment({
        investor_id: investor.id,
        pitch_id: pitch.id,
        amount: faker.number.int({ min: 10000, max: 50000 }),
        status: 'COMPLETED'
      })
    );

    return {
      founder,
      startup,
      pitch,
      investors,
      investments,
    };
  }

  /**
   * Generate edge case data
   */
  static generateEdgeCases() {
    return {
      // Very small amounts
      microInvestment: this.generateInvestment({ amount: 1 }),

      // Very large amounts
      largeInvestment: this.generateInvestment({ amount: 9999999 }),

      // Special characters in names
      specialCharUser: this.generateUser({
        name: 'José María O\'Connor-Smith Jr.',
        email: 'jose.maria@test.com'
      }),

      // Very long descriptions
      longDescriptionStartup: this.generateStartup({
        description: faker.lorem.paragraphs(10)
      }),

      // Unicode characters
      unicodeStartup: this.generateStartup({
        name: '创业公司 🚀',
        description: '国际化测试用例'
      }),

      // Boundary dates
      oldStartup: this.generateStartup({
        founded_date: faker.date.past({ years: 20 }).toISOString().split('T')[0]
      }),

      // Future dates (invalid)
      futureStartup: this.generateStartup({
        founded_date: faker.date.future().toISOString().split('T')[0]
      }),
    };
  }

  /**
   * Generate performance test data
   */
  static generatePerformanceTestData(count: number) {
    const users = this.generateUsers(count);
    const startups = this.generateStartups(count);
    const pitches = this.generatePitches(count * 2); // More pitches than startups
    const investments = this.generateInvestments(count * 5); // Many investments

    return {
      users,
      startups,
      pitches,
      investments,
      totalRecords: users.length + startups.length + pitches.length + investments.length,
    };
  }

  /**
   * Generate data for stress testing
   */
  static generateStressTestData() {
    const userCount = 1000;
    const startupCount = 500;
    const pitchCount = 1000;
    const investmentCount = 5000;

    return {
      users: this.generateUsers(userCount),
      startups: this.generateStartups(startupCount),
      pitches: this.generatePitches(pitchCount),
      investments: this.generateInvestments(investmentCount),
      metadata: {
        userCount,
        startupCount,
        pitchCount,
        investmentCount,
        totalRecords: userCount + startupCount + pitchCount + investmentCount,
      },
    };
  }
}

export default TestDataGenerator;