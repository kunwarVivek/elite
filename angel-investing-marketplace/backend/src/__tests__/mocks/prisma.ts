import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

// Create a deep mock of PrismaClient
export const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

// Reset mock between tests
export const resetPrismaMock = () => {
  mockReset(prismaMock);
};

// Mock Prisma Client constructor
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => prismaMock),
}));

export default prismaMock;
