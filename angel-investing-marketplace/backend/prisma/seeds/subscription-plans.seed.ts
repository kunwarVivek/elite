import { PrismaClient, PlanTier, BillingInterval } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedSubscriptionPlans() {
  console.log('Seeding subscription plans...')

  // Free Plan
  const freePlan = await prisma.subscriptionPlan.upsert({
    where: { slug: 'free' },
    update: {},
    create: {
      name: 'Free',
      slug: 'free',
      tier: PlanTier.FREE,
      price: 0,
      billingInterval: BillingInterval.MONTHLY,
      trialDays: 0,
      displayOrder: 0,
      description: 'Perfect for exploring the platform and getting started with angel investing',
      features: {
        browsDeals: true,
        investmentTracking: true,
        safeAgreements: false,
        convertibleNotes: false,
        capTableManagement: false,
        dilutionCalculator: false,
        waterfallAnalysis: false,
        termSheetTemplates: false,
        investorRightsManagement: false,
        exitManagement: false,
        portfolioAnalytics: false,
        documentVault: true,
        emailSupport: false,
        prioritySupport: false,
        apiAccess: false,
      },
      limits: {
        investments: 5,
        documents: 10,
        documentStorageMB: 100,
        apiCallsPerMonth: 0,
        termSheetsPerYear: 0,
        teamMembers: 1,
      },
      isActive: true,
    },
  })

  // Investor Pro Plan (Monthly)
  const investorProMonthly = await prisma.subscriptionPlan.upsert({
    where: { slug: 'investor-pro-monthly' },
    update: {},
    create: {
      name: 'Investor Pro',
      slug: 'investor-pro-monthly',
      tier: PlanTier.PRO,
      price: 49,
      billingInterval: BillingInterval.MONTHLY,
      trialDays: 14,
      displayOrder: 1,
      description: 'For active angel investors managing multiple investments',
      highlightedText: 'Most Popular',
      features: {
        browsDeals: true,
        investmentTracking: true,
        safeAgreements: true,
        convertibleNotes: true,
        capTableManagement: true,
        dilutionCalculator: true,
        waterfallAnalysis: false,
        termSheetTemplates: true,
        investorRightsManagement: true,
        exitManagement: true,
        portfolioAnalytics: true,
        documentVault: true,
        emailSupport: true,
        prioritySupport: false,
        apiAccess: false,
      },
      limits: {
        investments: -1, // unlimited
        documents: 500,
        documentStorageMB: 5120, // 5GB
        apiCallsPerMonth: 0,
        termSheetsPerYear: 3,
        teamMembers: 1,
      },
      isActive: true,
    },
  })

  // Investor Pro Plan (Annual)
  const investorProAnnual = await prisma.subscriptionPlan.upsert({
    where: { slug: 'investor-pro-annual' },
    update: {},
    create: {
      name: 'Investor Pro',
      slug: 'investor-pro-annual',
      tier: PlanTier.PRO,
      price: 470, // 49 * 12 * 0.8 = ~470 (20% discount)
      billingInterval: BillingInterval.ANNUAL,
      trialDays: 14,
      displayOrder: 2,
      description: 'For active angel investors managing multiple investments',
      highlightedText: 'Save 20%',
      features: {
        browsDeals: true,
        investmentTracking: true,
        safeAgreements: true,
        convertibleNotes: true,
        capTableManagement: true,
        dilutionCalculator: true,
        waterfallAnalysis: false,
        termSheetTemplates: true,
        investorRightsManagement: true,
        exitManagement: true,
        portfolioAnalytics: true,
        documentVault: true,
        emailSupport: true,
        prioritySupport: false,
        apiAccess: false,
      },
      limits: {
        investments: -1,
        documents: 500,
        documentStorageMB: 5120,
        apiCallsPerMonth: 0,
        termSheetsPerYear: 3,
        teamMembers: 1,
      },
      isActive: true,
    },
  })

  // Founder Growth Plan (Monthly)
  const founderGrowthMonthly = await prisma.subscriptionPlan.upsert({
    where: { slug: 'founder-growth-monthly' },
    update: {},
    create: {
      name: 'Founder Growth',
      slug: 'founder-growth-monthly',
      tier: PlanTier.GROWTH,
      price: 199,
      billingInterval: BillingInterval.MONTHLY,
      trialDays: 14,
      displayOrder: 3,
      description: 'For founders raising capital and managing investor relationships',
      features: {
        browsDeals: true,
        investmentTracking: true,
        safeAgreements: true,
        convertibleNotes: true,
        capTableManagement: true,
        dilutionCalculator: true,
        waterfallAnalysis: true,
        termSheetTemplates: true,
        investorRightsManagement: true,
        exitManagement: true,
        portfolioAnalytics: true,
        documentVault: true,
        emailSupport: true,
        prioritySupport: true,
        apiAccess: true,
      },
      limits: {
        investments: -1,
        documents: 2000,
        documentStorageMB: 51200, // 50GB
        apiCallsPerMonth: 1000,
        termSheetsPerYear: -1, // unlimited
        teamMembers: 5,
      },
      isActive: true,
    },
  })

  // Founder Growth Plan (Annual)
  const founderGrowthAnnual = await prisma.subscriptionPlan.upsert({
    where: { slug: 'founder-growth-annual' },
    update: {},
    create: {
      name: 'Founder Growth',
      slug: 'founder-growth-annual',
      tier: PlanTier.GROWTH,
      price: 1910, // 199 * 12 * 0.8 = ~1910 (20% discount)
      billingInterval: BillingInterval.ANNUAL,
      trialDays: 14,
      displayOrder: 4,
      description: 'For founders raising capital and managing investor relationships',
      highlightedText: 'Save 20%',
      features: {
        browsDeals: true,
        investmentTracking: true,
        safeAgreements: true,
        convertibleNotes: true,
        capTableManagement: true,
        dilutionCalculator: true,
        waterfallAnalysis: true,
        termSheetTemplates: true,
        investorRightsManagement: true,
        exitManagement: true,
        portfolioAnalytics: true,
        documentVault: true,
        emailSupport: true,
        prioritySupport: true,
        apiAccess: true,
      },
      limits: {
        investments: -1,
        documents: 2000,
        documentStorageMB: 51200,
        apiCallsPerMonth: 1000,
        termSheetsPerYear: -1,
        teamMembers: 5,
      },
      isActive: true,
    },
  })

  // Enterprise Plan (placeholder - custom pricing)
  const enterprisePlan = await prisma.subscriptionPlan.upsert({
    where: { slug: 'enterprise' },
    update: {},
    create: {
      name: 'Enterprise',
      slug: 'enterprise',
      tier: PlanTier.ENTERPRISE,
      price: 999, // Placeholder price
      billingInterval: BillingInterval.MONTHLY,
      trialDays: 30,
      displayOrder: 5,
      description: 'For organizations with advanced needs and custom requirements',
      highlightedText: 'Custom Pricing',
      features: {
        browsDeals: true,
        investmentTracking: true,
        safeAgreements: true,
        convertibleNotes: true,
        capTableManagement: true,
        dilutionCalculator: true,
        waterfallAnalysis: true,
        termSheetTemplates: true,
        investorRightsManagement: true,
        exitManagement: true,
        portfolioAnalytics: true,
        documentVault: true,
        emailSupport: true,
        prioritySupport: true,
        apiAccess: true,
        dedicatedAccountManager: true,
        customIntegrations: true,
        whiteLabeling: true,
        advancedSecurity: true,
        slaGuarantee: true,
      },
      limits: {
        investments: -1,
        documents: -1,
        documentStorageMB: -1, // unlimited
        apiCallsPerMonth: -1,
        termSheetsPerYear: -1,
        teamMembers: -1,
      },
      isActive: true,
    },
  })

  console.log('✅ Subscription plans seeded successfully')
  console.log(`Created plans: ${[freePlan, investorProMonthly, investorProAnnual, founderGrowthMonthly, founderGrowthAnnual, enterprisePlan].map(p => p.name).join(', ')}`)
}

// Run seed if called directly
if (require.main === module) {
  seedSubscriptionPlans()
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
