import { redisClient } from '@/core/redis/redis.client';
import { AUTH_TOKEN_KEYS, AUTH_TOKEN_TTL } from '@/shared/constants/auth-token.constants';

const redis = redisClient.getInstance();

export const authTokenService = {
  async saveVerifyEmailToken(userId: string, token: string) {
    await redis.set(AUTH_TOKEN_KEYS.verifyEmail(token), userId, {
      EX: AUTH_TOKEN_TTL.VERIFY_EMAIL,
    });
  },

  async getUserIdByVerifyToken(token: string) {
    return await redis.get(AUTH_TOKEN_KEYS.verifyEmail(token));
  },

  async deleteVerifyEmailToken(token: string) {
    await redis.del(AUTH_TOKEN_KEYS.verifyEmail(token));
  },

  async saveResetPasswordToken(userId: string, token: string) {
    await redis.set(AUTH_TOKEN_KEYS.resetPassword(token), userId, {
      EX: AUTH_TOKEN_TTL.RESET_PASSWORD,
    });
  },

  async getUserIdByResetToken(token: string) {
    return await redis.get(AUTH_TOKEN_KEYS.resetPassword(token));
  },

  async deleteResetPasswordToken(token: string) {
    await redis.del(AUTH_TOKEN_KEYS.resetPassword(token));
  },
};
