import { redisClient } from '@/core/cache/redis';

const redis = redisClient.getInstance();

export const sessionService = {
  async createSession(
    userId: string,
    tokenId: string,
    refreshToken: string,
    ttl: number,
  ) {
    const sessionKey = `session:${userId}:${tokenId}`;
    // userSessionKey lưu những thiết bị đang đăng nhập vào tài khoản này
    // Sau này dễ mở rộng thêm information devices
    const userSessionsKey = `user_sessions:${userId}`;

    await redis.set(sessionKey, refreshToken, {
      EX: ttl,
    });

    await redis.sAdd(userSessionsKey, tokenId);

    await redis.expire(userSessionsKey, ttl + 3600);
  },

  async getSession(userId: string, tokenId: string) {
    const sessionKey = `session:${userId}:${tokenId}`;
    const userSessionsKey = `user_sessions:${userId}`;

    const session = await redis.get(sessionKey);

    if (!session) {
      await redis.sRem(userSessionsKey, tokenId);
    }

    return session; 
  },

  async deleteSession(userId: string, tokenId: string) {
    const sessionKey = `session:${userId}:${tokenId}`;
    const userSessionsKey = `user_sessions:${userId}`;

    await redis.del(sessionKey);
    await redis.sRem(userSessionsKey, tokenId);
  },

  async deleteAllSessions(userId: string) {
    const userSessionsKey = `user_sessions:${userId}`;

    const tokenIds = await redis.sMembers(userSessionsKey);

    if (tokenIds.length === 0) return;

    const pipeline = redis.multi();

    tokenIds.forEach((tokenId) => {
      pipeline.del(`session:${userId}:${tokenId}`);
    });

    pipeline.del(userSessionsKey);

    await pipeline.exec();
  },
};