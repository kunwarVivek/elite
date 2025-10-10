import { jest } from '@jest/globals';

// Mock Redis client with all commonly used methods
export const redisMock = {
  // Basic operations
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),

  // Hash operations
  hget: jest.fn(),
  hset: jest.fn(),
  hdel: jest.fn(),
  hgetall: jest.fn(),

  // List operations
  lpush: jest.fn(),
  rpush: jest.fn(),
  lpop: jest.fn(),
  rpop: jest.fn(),
  lrange: jest.fn(),

  // Set operations
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn(),
  sismember: jest.fn(),

  // Sorted set operations
  zadd: jest.fn(),
  zrem: jest.fn(),
  zrange: jest.fn(),
  zrangebyscore: jest.fn(),

  // Connection
  connect: jest.fn(),
  disconnect: jest.fn(),
  quit: jest.fn(),
  ping: jest.fn(),

  // Pub/Sub
  publish: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),

  // Transaction
  multi: jest.fn(() => ({
    exec: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  })),

  // Status
  status: 'ready',

  // Event listeners
  on: jest.fn(),
  once: jest.fn(),
  off: jest.fn(),
};

// Reset mock between tests
export const resetRedisMock = () => {
  Object.keys(redisMock).forEach((key) => {
    const value = redisMock[key as keyof typeof redisMock];
    if (typeof value === 'function' && 'mockReset' in value) {
      (value as jest.Mock).mockReset();
    }
  });
  redisMock.status = 'ready';
};

// Mock Redis module
jest.mock('ioredis', () => {
  return jest.fn(() => redisMock);
});

export default redisMock;
