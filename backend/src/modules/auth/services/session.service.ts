import { redisClient } from '@/core/redis/redis.client';
import { SESSION_KEYS, SESSION_TTL } from '@/shared/constants/session.constants';

const redis = redisClient.getInstance();

export const sessionService = {
  // Tạo session cho một phiên đăng nhập
  // Và thêm phiên đăng nhập đó vào trong set các phiên đăng nhập của userId hiện tại
  async createSession(userId: string, tokenId: string, refreshToken: string, ttl: number) {
    const sessionKey = SESSION_KEYS.session(userId, tokenId);
    // userSessionKey lưu những thiết bị đang đăng nhập vào tài khoản này
    // Sau này dễ mở rộng thêm information devices
    const userSessionsKey = SESSION_KEYS.userSessions(userId);

    await redis.set(sessionKey, refreshToken, {
      EX: ttl,
    });

    await redis.sAdd(userSessionsKey, tokenId);

    await redis.expire(userSessionsKey, ttl + SESSION_TTL.USER_SESSIONS_TTL_BUFFER);
  },

  // Lấy ra một session của userId trong Redis.
  // Nếu session đó không tồn tại trong Redis thì sẽ được xóa trong userSessionsKey luôn
  async getSession(userId: string, tokenId: string) {
    const sessionKey = SESSION_KEYS.session(userId, tokenId);
    const userSessionsKey = SESSION_KEYS.userSessions(userId);

    const session = await redis.get(sessionKey);

    if (!session) {
      await redis.sRem(userSessionsKey, tokenId);
    }

    return session;
  },

  // Xóa session đăng nhập của userId. Chú ý là phải xóa trong userSessionsKey nữa
  async deleteSession(userId: string, tokenId: string) {
    const sessionKey = SESSION_KEYS.session(userId, tokenId);
    const userSessionsKey = SESSION_KEYS.userSessions(userId);

    await redis.del(sessionKey);
    await redis.sRem(userSessionsKey, tokenId);
  },

  // Xóa tất cả session đăng nhập của một userId
  async deleteAllSessions(userId: string) {
    const userSessionsKey = SESSION_KEYS.userSessions(userId);

    const tokenIds = await redis.sMembers(userSessionsKey);

    if (tokenIds.length === 0) return;

    const pipeline = redis.multi();

    tokenIds.forEach((tokenId) => {
      pipeline.del(SESSION_KEYS.session(userId, tokenId));
    });

    pipeline.del(userSessionsKey);

    await pipeline.exec();
  },

  async markTokenAsUsed(tokenId: string, userId: string) {
    const key = SESSION_KEYS.usedToken(tokenId);
    await redis.set(key, userId, {
      EX: SESSION_TTL.RESUSE_DETECTION_TTL,
    });
  },

  async getUsedTokenOwner(tokenId: string) {
    const key = SESSION_KEYS.usedToken(tokenId);
    return await redis.get(key);
  },
};
