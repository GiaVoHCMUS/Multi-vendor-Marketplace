import { redisClient } from '../../core/redis/redis.client';
const redis = redisClient.getInstance();

export const cacheService = {
  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttl: number = 3600): Promise<T> {
    // Get cache
    const cachedData = await redis.get(key);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    const freshData = await fetchFn();
    if (freshData) {
      // Set Cache
      await redis.set(key, JSON.stringify(freshData), {
        EX: ttl,
      });
    }
    return freshData;
  },

  // Xóa một key trong cache
  async delete(key: string) {
    return redis.del(key);
  },

  // Cách dùng versioning
  async getTracker(key: string) {
    let version = await redis.get(key);
    if (!version) {
      version = '1';
      await redis.set(key, version);
    }
    return version;
  },

  // Tăng Tracker -> invalidate các version cũ
  async invalidateTracker(key: string) {
    const newVersion = await redis.incr(key);
    return newVersion;
  },
};
