import { prisma } from '@/core/config/prisma';
import { v4 as uuidv4 } from 'uuid';
import { TokenPayload } from '@/shared/types/auth';
import { AppError } from '@/shared/utils/AppError';
import { tokenUtils } from '@/shared/utils/jwt';
import bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { sessionService } from '@/core/cache/session.service';
import { MESSAGE } from '@/shared/constants/message.constants';
import { mailJob } from '@/jobs/mail/mail.job';
import { redisClient } from '@/core/cache/redis';

const redis = redisClient.getInstance();
const RT_EXPIRES_IN_DAYS = 14;
const RT_TTL = RT_EXPIRES_IN_DAYS * 24 * 60 * 60;

// src/modules/auth/auth.service.ts
export const authService = {
  // Tạo cặp token và lưu session vào Redis (Hỗ trợ Multi-device)
  generateAndStoreTokens: async (
    userId: string,
    role: UserRole,
  ): Promise<TokenPayload> => {
    const tokenId = uuidv4(); // Unique id cho mỗi session (device)
    const accessToken = tokenUtils.generateAccessToken(userId, role);
    const refreshToken = tokenUtils.generateRefreshToken(userId, role, tokenId);

    // Lưu vào Redis: session:userId:tokenId
    await sessionService.createSession(userId, tokenId, refreshToken, RT_TTL);

    return { accessToken, refreshToken };
  },

  register: async (email: string, passwordInput: string, fullName: string) => {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError(MESSAGE.AUTH.EMAIL_ALREADY_EXISTS, 400);
    }

    const hashPassword = await bcrypt.hash(passwordInput, 12);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashPassword,
        fullName,
      },
    });

    // Tạo token xác thực và lưu vào Redis
    const verificationToken = uuidv4();
    const VERIFY_TTL = 10 * 60;
    await redis.set(`verify-email:${verificationToken}`, user.id, {
      EX: VERIFY_TTL,
    });

    await mailJob.sendWelcomeRegistration({
      to: user.email,
      fullName: user.fullName,
      token: verificationToken,
    });
  },

  verifyEmail: async (token: string) => {
    const userId = await redis.get(`verify-email:${token}`);
    if (!userId) {
      throw new AppError(MESSAGE.AUTH.INVALID_OR_EXPIRED_TOKEN, 400);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    });

    // Xóa token sau khi dùng xong
    await redis.del(`verify-email:${token}`);
  },

  login: async (email: string, password: string) => {
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new AppError(MESSAGE.AUTH.INVALID_CREDENTIALS, 401);
    }

    // Check xác thực email
    if (!user.isVerified) {
      throw new AppError('Vui lòng xác thực email trước khi đăng nhập', 403);
    }

    const tokens = await authService.generateAndStoreTokens(user.id, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
      },
      ...tokens,
    };
  },

  logout: async (refreshToken: string) => {
    const decoded = tokenUtils.verifyRefreshToken(refreshToken);
    await sessionService.deleteSession(decoded.sub, decoded.tokenId);
  },

  refreshToken: async (oldRefreshToken: string): Promise<TokenPayload> => {
    const decoded = tokenUtils.verifyRefreshToken(oldRefreshToken);
    const { sub: userId, role, tokenId } = decoded;

    // Kiểm tra xem tokenId này đã nằm trong danh sách đã dùng chưa
    const ownerId = await sessionService.getUsedTokenOwner(tokenId);

    if (ownerId) {
      // Nếu tồn tại ownerId nghĩa là tokenId này vừa được dùng để refresh thành công trước đó
      // Token bị dùng lại
      await sessionService.deleteAllSessions(userId);
      throw new AppError(MESSAGE.AUTH.SECURITY_BREACH, 403);
    }

    // Lấy token đã lưu trong Session Service
    const savedToken = await sessionService.getSession(userId, tokenId);

    // Token đã bị xóa hoặc hết hạn
    if (!savedToken) {
      throw new AppError(MESSAGE.AUTH.SESSION_EXPIRED, 401);
    }

    // So sánh tính hợp lệ của token (đề phòng tokenId cũ bị giả mạo)
    if (savedToken !== oldRefreshToken) {
      // Xóa tất cả session đang đăng nhập
      await sessionService.deleteAllSessions(userId);
      throw new AppError(MESSAGE.AUTH.SECURITY_BREACH, 403);
    }

    // Thực hiện Rotation
    await sessionService.markTokenAsUsed(tokenId, userId);
    await sessionService.deleteSession(userId, tokenId);

    // Cấp session mới
    return authService.generateAndStoreTokens(userId, role);
  },

  forgotPassword: async (email: string) => {
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    if (!user) {
      throw new AppError(MESSAGE.AUTH.NOT_FOUND_EMAIL, 404);
    }

    const resetToken = uuidv4();
    const RESET_TTL = 10 * 60;
    await redis.set(`reset-password:${resetToken}`, user.id, {
      EX: RESET_TTL,
    });

    // Gửi mail Reset Password qua Queue
    await mailJob.sendForgotPassword({
      to: user.email,
      fullName: user.fullName,
      token: resetToken,
    });
  },

  resetPassword: async (token: string, password: string) => {
    const userId = await redis.get(`reset-password:${token}`);

    if (!userId) {
      throw new AppError(MESSAGE.AUTH.INVALID_OR_EXPIRED_TOKEN, 400);
    }

    const hashPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashPassword,
      },
    });

    await redis.del(`reset-password:${token}`);
    // Logout tất cả thiết bị vì mật khẩu đã thay đổi (Bảo mật)
    await sessionService.deleteAllSessions(userId);
  },
};
