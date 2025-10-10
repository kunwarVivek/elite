// Use string literals to avoid Prisma client generation issues in tests
import { mockStartups } from './startups';

export const mockPitches = {
  active: {
    id: 'pitch-active-1',
    startup_id: mockStartups.growthStage.id,
    title: 'Seed Round Investment Opportunity',
    summary: 'Join us in revolutionizing the FinTech industry',
    description: 'We are raising $1M to scale our operations and expand to new markets.',
    funding_amount: 1000000,
    equity_offered: 10,
    minimum_investment: 10000,
    deadline: new Date('2024-12-31'),
    status: 'active' as any,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  draft: {
    id: 'pitch-draft-1',
    startup_id: mockStartups.mvp.id,
    title: 'MVP Funding Round',
    summary: 'Early stage investment opportunity',
    description: 'We need funding to complete our MVP and launch to market.',
    funding_amount: 500000,
    equity_offered: 15,
    minimum_investment: 5000,
    deadline: new Date('2024-12-31'),
    status: 'draft' as any,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  closed: {
    id: 'pitch-closed-1',
    startup_id: mockStartups.verified.id,
    title: 'Series A Round - CLOSED',
    summary: 'Successfully funded Series A round',
    description: 'We successfully raised $2M for our Series A round.',
    funding_amount: 2000000,
    equity_offered: 8,
    minimum_investment: 25000,
    deadline: new Date('2024-06-30'),
    status: 'closed' as any,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-07-01'),
  },
};

export const createMockPitch = (overrides: Partial<typeof mockPitches.active> = {}) => ({
  ...mockPitches.active,
  ...overrides,
});
