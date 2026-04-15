import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redisClient } from '../cache/redis';

const redis = redisClient.getInstance();
const PREFIX = 'rate-limit';

// Auth Limiter
export const authLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: `${PREFIX}:auth`,
  points: 5,
  duration: 15 * 60,
  blockDuration: 60 * 60,
  useRedisPackage: true,
});

// Mail Limiter
export const mailLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: `${PREFIX}:mail`,
  points: 3,
  duration: 15 * 60,
  blockDuration: 60 * 60,
  useRedisPackage: true,
});

// 2. Public API Limiter
export const publicLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: `${PREFIX}:public`,
  points: 60,
  duration: 60,
  useRedisPackage: true,
});

// 3. Transaction Limiter
export const transactionLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: `${PREFIX}:transaction`,
  points: 3,
  duration: 60,
  useRedisPackage: true,
});

// 4. Management Limiter (Dành cho Vendor/Admin thao tác CRUD)
export const managementLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: `${PREFIX}:manage`,
  points: 30,
  duration: 60 * 60,
  useRedisPackage: true,
});
