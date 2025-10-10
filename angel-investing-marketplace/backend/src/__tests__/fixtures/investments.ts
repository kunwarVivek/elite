// Use string literals to avoid Prisma client generation issues in tests
import { mockUsers } from './users';
import { mockPitches } from './pitches';

export const mockInvestments = {
  completed: {
    id: 'investment-completed-1',
    investor_id: mockUsers.investor.id,
    pitch_id: mockPitches.active.id,
    amount: 50000,
    equity_percentage: 0.5,
    status: 'completed' as any,
    payment_method: 'stripe',
    payment_intent_id: 'pi_mock_completed_123',
    created_at: new Date('2024-01-15'),
    updated_at: new Date('2024-01-15'),
  },
  pending: {
    id: 'investment-pending-1',
    investor_id: mockUsers.investor.id,
    pitch_id: mockPitches.active.id,
    amount: 25000,
    equity_percentage: 0.25,
    status: 'pending' as any,
    payment_method: 'stripe',
    payment_intent_id: 'pi_mock_pending_456',
    created_at: new Date('2024-02-01'),
    updated_at: new Date('2024-02-01'),
  },
  cancelled: {
    id: 'investment-cancelled-1',
    investor_id: mockUsers.investor.id,
    pitch_id: mockPitches.active.id,
    amount: 10000,
    equity_percentage: 0.1,
    status: 'cancelled' as any,
    payment_method: 'stripe',
    payment_intent_id: 'pi_mock_cancelled_789',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-05'),
  },
};

export const createMockInvestment = (overrides: Partial<typeof mockInvestments.completed> = {}) => ({
  ...mockInvestments.completed,
  ...overrides,
});
