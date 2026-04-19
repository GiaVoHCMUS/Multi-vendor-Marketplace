import { v4 as uuidv4 } from 'uuid';
import { TokenPayload } from '@/shared/types/auth';
import { AppError } from '@/shared/utils/AppError';
import { tokenUtils } from '@/shared/utils/jwt';
import bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { sessionService } from '@/modules/auth/services/session.service';
import { MESSAGE } from '@/shared/constants/message.constants';
import { mailJob } from '@/jobs/mail/mail.job';
import { SESSION_TTL } from '@/shared/constants/session.constants';
import { StatusCodes } from 'http-status-codes';
import { userRepository } from '../user/user.repository';
import { authTokenService } from './services/auth-token.service';

// src/modules/auth/auth.service.ts
export const authService = {
  // Tạo cặp token và lưu session vào Redis (Hỗ trợ Multi-device)
  generateAndStoreTokens: async (userId: string, role: UserRole): Promise<TokenPayload> => {
    const tokenId = uuidv4(); // Unique id cho mỗi session (device)
    const accessToken = tokenUtils.generateAccessToken(userId, role);
    const refreshToken = tokenUtils.generateRefreshToken(userId, role, tokenId);

    // Lưu vào Redis: session:userId:tokenId
    await sessionService.createSession(
      userId,
      tokenId,
      refreshToken,
      SESSION_TTL.REFRESH_TOKEN_TTL,
    );

    return { accessToken, refreshToken };
  },

  register: async (email: string, passwordInput: string, fullName: string) => {
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError(MESSAGE.AUTH.EMAIL_ALREADY_EXISTS, StatusCodes.CONFLICT);
    }

    const hashPassword = await bcrypt.hash(passwordInput, 12);
    const user = await userRepository.createUser({
      email,
      password: hashPassword,
      fullName,
    });

    // Tạo token xác thực và lưu vào Redis
    const verificationToken = uuidv4();
    await authTokenService.saveVerifyEmailToken(user.id, verificationToken);

    await mailJob.sendWelcomeRegistration({
      to: user.email,
      fullName: user.fullName,
      token: verificationToken,
    });
  },

  verifyEmail: async (token: string) => {
    const userId = await authTokenService.getUserIdByVerifyToken(token);
    if (!userId) {
      throw new AppError(MESSAGE.AUTH.INVALID_OR_EXPIRED_TOKEN, StatusCodes.BAD_REQUEST);
    }

    await userRepository.markEmailAsVerified(userId);

    // Xóa token sau khi dùng xong
    await authTokenService.deleteVerifyEmailToken(token);
  },

  login: async (email: string, password: string) => {
    const user = await userRepository.findByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new AppError(MESSAGE.AUTH.INVALID_CREDENTIALS, StatusCodes.UNAUTHORIZED);
    }

    // Check xác thực email
    if (!user.isVerified) {
      throw new AppError('Vui lòng xác thực email trước khi đăng nhập', StatusCodes.FORBIDDEN);
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
      throw new AppError(MESSAGE.AUTH.SECURITY_BREACH, StatusCodes.FORBIDDEN);
    }

    // Lấy token đã lưu trong Session Service
    const savedToken = await sessionService.getSession(userId, tokenId);

    // Token đã bị xóa hoặc hết hạn
    if (!savedToken) {
      throw new AppError(MESSAGE.AUTH.SESSION_EXPIRED, StatusCodes.UNAUTHORIZED);
    }

    // So sánh tính hợp lệ của token (đề phòng tokenId cũ bị giả mạo)
    if (savedToken !== oldRefreshToken) {
      // Xóa tất cả session đang đăng nhập
      await sessionService.deleteAllSessions(userId);
      throw new AppError(MESSAGE.AUTH.SECURITY_BREACH, StatusCodes.FORBIDDEN);
    }

    // Thực hiện Rotation
    await sessionService.markTokenAsUsed(tokenId, userId);
    await sessionService.deleteSession(userId, tokenId);

    // Cấp session mới
    return authService.generateAndStoreTokens(userId, role);
  },

  forgotPassword: async (email: string) => {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      throw new AppError(MESSAGE.AUTH.NOT_FOUND_EMAIL, StatusCodes.NOT_FOUND);
    }

    const resetToken = uuidv4();
    await authTokenService.saveResetPasswordToken(user.id, resetToken);

    // Gửi mail Reset Password qua Queue
    await mailJob.sendForgotPassword({
      to: user.email,
      fullName: user.fullName,
      token: resetToken,
    });
  },

  resetPassword: async (token: string, password: string) => {
    const userId = await authTokenService.getUserIdByResetToken(token);

    if (!userId) {
      throw new AppError(MESSAGE.AUTH.INVALID_OR_EXPIRED_TOKEN, StatusCodes.BAD_REQUEST);
    }

    const hashPassword = await bcrypt.hash(password, 12);

    await userRepository.updatePassword(userId, hashPassword);

    await authTokenService.deleteResetPasswordToken(token);
    // Logout tất cả thiết bị vì mật khẩu đã thay đổi (Bảo mật)
    await sessionService.deleteAllSessions(userId);
  },
};
