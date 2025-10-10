/**
 * Database Seed Script
 *
 * This script seeds the database with development data.
 * It is IDEMPOTENT - can be run multiple times safely without creating duplicates.
 *
 * All records use upsert patterns or existence checks to prevent duplicate creation.
 *
 * Usage:
 *   npm run db:seed
 *
 * Note: Safe to run multiple times on the same database.
 */
import { PrismaClient, UserRole, StartupStage, PitchStatus, InvestmentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@angelmarketplace.com' },
    update: {},
    create: {
      email: 'admin@angelmarketplace.com',
      name: 'System Administrator',
      role: UserRole.ADMIN,
      isVerified: true,
      profileData: {
        bio: 'Platform administrator',
        location: 'San Francisco, CA',
      },
    },
  });

  // Create sample investors
  const investor1 = await prisma.user.upsert({
    where: { email: 'investor1@example.com' },
    update: {},
    create: {
      email: 'investor1@example.com',
      name: 'Sarah Chen',
      role: UserRole.INVESTOR,
      isVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      profileData: {
        bio: 'Experienced angel investor with 15+ years in fintech and SaaS startups.',
        location: 'San Francisco, CA',
        linkedinUrl: 'https://linkedin.com/in/sarahchen',
        investmentRangeMin: 25000,
        investmentRangeMax: 100000,
        preferredIndustries: ['Fintech', 'SaaS', 'Healthcare'],
        previousExits: [
          { company: 'TechCorp', amount: 5000000, year: 2022 },
          { company: 'DataFlow', amount: 2500000, year: 2021 },
        ],
      },
      userProfile: {
        create: {
          bio: 'Experienced angel investor with 15+ years in fintech and SaaS startups.',
          location: 'San Francisco, CA',
          linkedinUrl: 'https://linkedin.com/in/sarahchen',
          investmentRangeMin: 25000,
          investmentRangeMax: 100000,
          preferredIndustries: ['Fintech', 'SaaS', 'Healthcare'],
          previousExits: [
            { company: 'TechCorp', amount: 5000000, year: 2022 },
            { company: 'DataFlow', amount: 2500000, year: 2021 },
          ],
          accreditationStatus: 'VERIFIED',
          kycStatus: 'VERIFIED',
        },
      },
    },
  });

  const investor2 = await prisma.user.upsert({
    where: { email: 'investor2@example.com' },
    update: {},
    create: {
      email: 'investor2@example.com',
      name: 'Michael Rodriguez',
      role: UserRole.INVESTOR,
      isVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      profileData: {
        bio: 'Former startup founder turned angel investor. Focus on AI/ML and consumer tech.',
        location: 'Austin, TX',
        linkedinUrl: 'https://linkedin.com/in/michaelrodriguez',
        investmentRangeMin: 50000,
        investmentRangeMax: 200000,
        preferredIndustries: ['AI/ML', 'Consumer Tech', 'Marketplace'],
        previousExits: [
          { company: 'SocialApp', amount: 8000000, year: 2023 },
        ],
      },
      userProfile: {
        create: {
          bio: 'Former startup founder turned angel investor. Focus on AI/ML and consumer tech.',
          location: 'Austin, TX',
          linkedinUrl: 'https://linkedin.com/in/michaelrodriguez',
          investmentRangeMin: 50000,
          investmentRangeMax: 200000,
          preferredIndustries: ['AI/ML', 'Consumer Tech', 'Marketplace'],
          previousExits: [
            { company: 'SocialApp', amount: 8000000, year: 2023 },
          ],
          accreditationStatus: 'VERIFIED',
          kycStatus: 'VERIFIED',
        },
      },
    },
  });

  // Create sample founders
  const founder1 = await prisma.user.upsert({
    where: { email: 'founder1@example.com' },
    update: {},
    create: {
      email: 'founder1@example.com',
      name: 'Emily Watson',
      role: UserRole.FOUNDER,
      isVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      profileData: {
        bio: 'Serial entrepreneur with background in computer science and product management.',
        location: 'New York, NY',
        linkedinUrl: 'https://linkedin.com/in/emilywatson',
        twitterUrl: 'https://twitter.com/emilywatson',
        websiteUrl: 'https://emilywatson.dev',
      },
    },
  });

  const founder2 = await prisma.user.upsert({
    where: { email: 'founder2@example.com' },
    update: {},
    create: {
      email: 'founder2@example.com',
      name: 'David Kim',
      role: UserRole.FOUNDER,
      isVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      profileData: {
        bio: 'PhD in Machine Learning, founded two successful AI startups.',
        location: 'Seattle, WA',
        linkedinUrl: 'https://linkedin.com/in/davidkim',
        twitterUrl: 'https://twitter.com/davidkim',
      },
    },
  });

  // Create sample startups
  const startup1 = await prisma.startup.upsert({
    where: { slug: 'fintech-platform' },
    update: {},
    create: {
      name: 'PayFlow',
      slug: 'fintech-platform',
      description: 'Next-generation payment processing platform for small businesses with AI-powered fraud detection.',
      industry: 'Fintech',
      stage: StartupStage.MVP,
      fundingGoal: 2000000,
      currentFunding: 150000,
      founderId: founder1.id,
      websiteUrl: 'https://payflow.com',
      logoUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=200&h=200&fit=crop',
      teamSize: 12,
      foundedDate: new Date('2023-01-15'),
      businessModel: 'SaaS with transaction fees',
      targetMarket: 'Small to medium businesses in US and Canada',
      competitiveAdvantage: 'AI-powered fraud detection reduces false positives by 90%',
      financialData: {
        monthlyRevenue: 45000,
        monthlyGrowth: 25,
        burnRate: 80000,
        runway: 18,
      },
      isVerified: true,
      isActive: true,
    },
  });

  const startup2 = await prisma.startup.upsert({
    where: { slug: 'ai-healthcare' },
    update: {},
    create: {
      name: 'MedAI',
      slug: 'ai-healthcare',
      description: 'AI-powered diagnostic assistant that helps doctors detect diseases earlier and more accurately.',
      industry: 'Healthcare',
      stage: StartupStage.PROTOTYPE,
      fundingGoal: 3000000,
      currentFunding: 50000,
      founderId: founder2.id,
      websiteUrl: 'https://medai.health',
      logoUrl: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=200&h=200&fit=crop',
      teamSize: 8,
      foundedDate: new Date('2023-06-01'),
      businessModel: 'B2B SaaS for hospitals and clinics',
      targetMarket: 'Hospitals and diagnostic centers worldwide',
      competitiveAdvantage: 'FDA-approved AI with 95% accuracy in early disease detection',
      financialData: {
        monthlyRevenue: 15000,
        monthlyGrowth: 40,
        burnRate: 60000,
        runway: 12,
      },
      isVerified: true,
      isActive: true,
    },
  });

  // Create sample pitches
  const pitch1 = await prisma.pitch.upsert({
    where: { slug: 'payflow-seed-round' },
    update: {},
    create: {
      startupId: startup1.id,
      title: 'PayFlow Seed Round - Revolutionizing Small Business Payments',
      slug: 'payflow-seed-round',
      summary: 'We\'re building the future of payment processing for small businesses with AI-powered fraud detection and instant settlement.',
      problemStatement: 'Small businesses lose $50B annually to payment fraud and face 3-5 day settlement delays.',
      solution: 'AI-powered fraud detection reduces false positives by 90% while enabling instant settlements.',
      marketOpportunity: '$500B payment processing market growing at 15% annually, with small businesses underserved.',
      competitiveAnalysis: 'Competitors like Stripe and Square lack advanced AI fraud detection and instant settlement features.',
      financialProjections: {
        year1: { revenue: 1200000, users: 5000 },
        year2: { revenue: 8500000, users: 25000 },
        year3: { revenue: 25000000, users: 75000 },
      },
      fundingAmount: 2000000,
      equityOffered: 15,
      minimumInvestment: 25000,
      status: PitchStatus.ACTIVE,
      pitchDeckUrl: 'https://pitchdeck.example.com/payflow',
      tags: ['Fintech', 'SaaS', 'AI', 'SMB'],
      viewCount: 245,
      isFeatured: true,
      expiresAt: new Date('2024-02-15'),
    },
  });

  const pitch2 = await prisma.pitch.upsert({
    where: { slug: 'medai-pre-seed' },
    update: {},
    create: {
      startupId: startup2.id,
      title: 'MedAI Pre-Seed - AI-Powered Early Disease Detection',
      slug: 'medai-pre-seed',
      summary: 'Revolutionary AI diagnostic tool that helps doctors detect cancer and other diseases months earlier than traditional methods.',
      problemStatement: 'Late disease detection leads to 70% lower survival rates and billions in healthcare costs.',
      solution: 'FDA-approved AI that analyzes medical images with 95% accuracy for early disease detection.',
      marketOpportunity: '$200B medical diagnostics market with AI adoption still in early stages.',
      competitiveAnalysis: 'More accurate than existing AI solutions and first to receive FDA approval for multiple disease types.',
      financialProjections: {
        year1: { revenue: 2000000, users: 100 },
        year2: { revenue: 15000000, users: 800 },
        year3: { revenue: 50000000, users: 2500 },
      },
      fundingAmount: 3000000,
      equityOffered: 20,
      minimumInvestment: 50000,
      status: PitchStatus.ACTIVE,
      pitchDeckUrl: 'https://pitchdeck.example.com/medai',
      tags: ['Healthcare', 'AI', 'Diagnostics', 'FDA'],
      viewCount: 189,
      isFeatured: false,
      expiresAt: new Date('2024-03-01'),
    },
  });

  // Create sample investments (idempotent - check for existence)
  let investment1 = await prisma.investment.findFirst({
    where: {
      investorId: investor1.id,
      pitchId: pitch1.id,
    },
  });

  if (!investment1) {
    investment1 = await prisma.investment.create({
      data: {
        investorId: investor1.id,
        pitchId: pitch1.id,
        amount: 75000,
        equityPercentage: 0.56,
        sharePrice: 15.00,
        status: InvestmentStatus.COMPLETED,
        investmentType: 'DIRECT',
        terms: {
          vestingSchedule: '4 years with 1 year cliff',
          boardSeat: false,
          informationRights: true,
        },
        investmentDate: new Date('2024-01-15'),
      },
    });
  }

  let investment2 = await prisma.investment.findFirst({
    where: {
      investorId: investor2.id,
      pitchId: pitch1.id,
    },
  });

  if (!investment2) {
    investment2 = await prisma.investment.create({
      data: {
        investorId: investor2.id,
        pitchId: pitch1.id,
        amount: 100000,
        equityPercentage: 0.75,
        sharePrice: 15.00,
        status: InvestmentStatus.COMPLETED,
        investmentType: 'DIRECT',
        terms: {
          vestingSchedule: '4 years with 1 year cliff',
          boardSeat: false,
          informationRights: true,
        },
        investmentDate: new Date('2024-01-20'),
      },
    });
  }

  // Create sample portfolios (idempotent - check for existence)
  const existingPortfolio = await prisma.portfolio.findFirst({
    where: {
      investorId: investor1.id,
      name: 'Tech Investments 2024',
    },
  });

  if (!existingPortfolio) {
    await prisma.portfolio.create({
      data: {
        investorId: investor1.id,
        name: 'Tech Investments 2024',
        description: 'Portfolio focused on fintech and SaaS startups',
        isPublic: true,
        totalInvested: 75000,
        totalValue: 112500, // Assuming 50% growth
        totalExits: 0,
        investmentCount: 1,
      },
    });
  }

  // Create sample transactions (idempotent - check for existence)
  const existingTransaction1 = await prisma.transaction.findFirst({
    where: {
      investmentId: investment1.id,
      userId: investor1.id,
      paymentReference: 'TXN-2024-001',
    },
  });

  if (!existingTransaction1) {
    await prisma.transaction.create({
      data: {
        investmentId: investment1.id,
        userId: investor1.id,
        type: 'INVESTMENT',
        amount: 75000,
        currency: 'USD',
        status: 'COMPLETED',
        paymentMethod: 'WIRE_TRANSFER',
        paymentProvider: 'BANK',
        paymentReference: 'TXN-2024-001',
        feeAmount: 0,
        netAmount: 75000,
        description: 'Investment in PayFlow seed round',
        processedAt: new Date('2024-01-15'),
      },
    });
  }

  const existingTransaction2 = await prisma.transaction.findFirst({
    where: {
      investmentId: investment2.id,
      userId: investor2.id,
      paymentReference: 'TXN-2024-002',
    },
  });

  if (!existingTransaction2) {
    await prisma.transaction.create({
      data: {
        investmentId: investment2.id,
        userId: investor2.id,
        type: 'INVESTMENT',
        amount: 100000,
        currency: 'USD',
        status: 'COMPLETED',
        paymentMethod: 'WIRE_TRANSFER',
        paymentProvider: 'BANK',
        paymentReference: 'TXN-2024-002',
        feeAmount: 0,
        netAmount: 100000,
        description: 'Investment in PayFlow seed round',
        processedAt: new Date('2024-01-20'),
      },
    });
  }

  // Create sample messages (idempotent - check for existence)
  const existingMessage1 = await prisma.message.findFirst({
    where: {
      senderId: founder1.id,
      receiverId: investor1.id,
      subject: 'Thank you for your investment!',
    },
  });

  if (!existingMessage1) {
    await prisma.message.create({
      data: {
        senderId: founder1.id,
        receiverId: investor1.id,
        pitchId: pitch1.id,
        subject: 'Thank you for your investment!',
        content: 'Dear Sarah, thank you for believing in PayFlow\'s vision. We\'re excited to have you as an investor and look forward to updating you on our progress.',
        messageType: 'INVESTMENT_DISCUSSION',
        isRead: false,
      },
    });
  }

  const existingMessage2 = await prisma.message.findFirst({
    where: {
      senderId: investor1.id,
      receiverId: founder1.id,
      subject: 'Re: Thank you for your investment!',
    },
  });

  if (!existingMessage2) {
    await prisma.message.create({
      data: {
        senderId: investor1.id,
        receiverId: founder1.id,
        pitchId: pitch1.id,
        subject: 'Re: Thank you for your investment!',
        content: 'Hi Emily, thrilled to be part of the PayFlow journey! Please keep me updated on key milestones and feel free to reach out if you need any strategic advice.',
        messageType: 'INVESTMENT_DISCUSSION',
        isRead: false,
      },
    });
  }

  // Create sample notifications (idempotent - check for existence)
  const existingNotification1 = await prisma.notification.findFirst({
    where: {
      userId: investor1.id,
      title: 'Investment Completed',
      type: 'INVESTMENT_UPDATE',
    },
  });

  if (!existingNotification1) {
    await prisma.notification.create({
      data: {
        userId: investor1.id,
        type: 'INVESTMENT_UPDATE',
        title: 'Investment Completed',
        content: 'Your investment in PayFlow has been successfully processed.',
        data: { investmentId: investment1.id, amount: 75000 },
        isRead: false,
        priority: 'MEDIUM',
      },
    });
  }

  const existingNotification2 = await prisma.notification.findFirst({
    where: {
      userId: founder1.id,
      title: 'New Investment Received',
      type: 'INVESTMENT_UPDATE',
    },
  });

  if (!existingNotification2) {
    await prisma.notification.create({
      data: {
        userId: founder1.id,
        type: 'INVESTMENT_UPDATE',
        title: 'New Investment Received',
        content: 'Congratulations! You have received a new investment of $75,000 from Sarah Chen.',
        data: { investmentId: investment1.id, amount: 75000 },
        isRead: false,
        priority: 'HIGH',
      },
    });
  }

  // Create sample documents (idempotent - check for existence)
  const existingDoc1 = await prisma.document.findFirst({
    where: {
      startupId: startup1.id,
      name: 'PayFlow Pitch Deck.pdf',
      fileType: 'PITCH_DECK',
    },
  });

  if (!existingDoc1) {
    await prisma.document.create({
      data: {
        startupId: startup1.id,
        pitchId: pitch1.id,
        name: 'PayFlow Pitch Deck.pdf',
        filePath: '/uploads/pitch-decks/payflow-pitch-deck.pdf',
        fileUrl: 'https://storage.example.com/pitch-decks/payflow-pitch-deck.pdf',
        fileType: 'PITCH_DECK',
        fileSize: 5242880, // 5MB
        mimeType: 'application/pdf',
        isPublic: true,
        uploadedBy: founder1.id,
      },
    });
  }

  const existingDoc2 = await prisma.document.findFirst({
    where: {
      startupId: startup1.id,
      name: 'Financial Projections.xlsx',
      fileType: 'FINANCIAL_STATEMENT',
    },
  });

  if (!existingDoc2) {
    await prisma.document.create({
      data: {
        startupId: startup1.id,
        name: 'Financial Projections.xlsx',
        filePath: '/uploads/financial/payflow-projections.xlsx',
        fileUrl: 'https://storage.example.com/financial/payflow-projections.xlsx',
        fileType: 'FINANCIAL_STATEMENT',
        fileSize: 1048576, // 1MB
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        isPublic: false,
        uploadedBy: founder1.id,
      },
    });
  }

  // Create sample audit logs (idempotent - check for existence)
  const existingAuditLog1 = await prisma.auditLog.findFirst({
    where: {
      userId: adminUser.id,
      action: 'USER_VERIFIED',
      entityType: 'USER',
      entityId: investor1.id,
    },
  });

  if (!existingAuditLog1) {
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'USER_VERIFIED',
        entityType: 'USER',
        entityId: investor1.id,
        newValues: { isVerified: true },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });
  }

  const existingAuditLog2 = await prisma.auditLog.findFirst({
    where: {
      userId: founder1.id,
      action: 'PITCH_CREATED',
      entityType: 'PITCH',
      entityId: pitch1.id,
    },
  });

  if (!existingAuditLog2) {
    await prisma.auditLog.create({
      data: {
        userId: founder1.id,
        action: 'PITCH_CREATED',
        entityType: 'PITCH',
        entityId: pitch1.id,
        newValues: { title: pitch1.title, status: 'ACTIVE' },
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
  }

  console.log('✅ Seed completed successfully!');
  console.log('📊 Created:');
  console.log(`   • ${await prisma.user.count()} users`);
  console.log(`   • ${await prisma.startup.count()} startups`);
  console.log(`   • ${await prisma.pitch.count()} pitches`);
  console.log(`   • ${await prisma.investment.count()} investments`);
  console.log(`   • ${await prisma.transaction.count()} transactions`);
  console.log(`   • ${await prisma.message.count()} messages`);
  console.log(`   • ${await prisma.notification.count()} notifications`);
  console.log(`   • ${await prisma.document.count()} documents`);
  console.log(`   • ${await prisma.auditLog.count()} audit logs`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });