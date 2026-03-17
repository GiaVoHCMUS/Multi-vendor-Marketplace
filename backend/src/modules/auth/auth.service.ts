import { prisma } from '@/core/config/prisma';
import { v4 as uuidv4 } from 'uuid';
import { AuthResponse, TokenPayload } from '@/shared/types/auth';
import { AppError } from '@/shared/utils/AppError';
import { tokenUtils } from '@/shared/utils/jwt';
import bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { sessionService } from '@/core/cache/session.service';
import { MESSAGE } from '@/shared/constants/message.constants';

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

  register: async (
    email: string,
    passwordInput: string,
    fullName: string,
  ): Promise<AuthResponse> => {
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

    const tokens = await authService.generateAndStoreTokens(user.id, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        avatarPublicId: user.avatarPublicId,
        bio: user.bio,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      ...tokens,
    };
  },

  login: async (email: string, password: string) => {
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new AppError(MESSAGE.AUTH.INVALID_CREDENTIALS, 401);
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
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
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

    // Lấy token đã lưu trong Session Service
    const savedToken = await sessionService.getSession(userId, tokenId);

    // Trường hợp 1: Token đã bị xóa hoặc hết hạn
    if (!savedToken) {
      throw new AppError(MESSAGE.AUTH.SESSION_EXPIRED, 401);
    }

    // Trường hợp 2: Token cũ bị dùng lại
    if (savedToken !== oldRefreshToken) {
      await sessionService.deleteAllSessions(userId);
      throw new AppError(MESSAGE.AUTH.SECURITY_BREACH, 403);
    }

    await sessionService.deleteSession(userId, tokenId);

    // Cấp session mới
    return authService.generateAndStoreTokens(userId, role);
  },
};
