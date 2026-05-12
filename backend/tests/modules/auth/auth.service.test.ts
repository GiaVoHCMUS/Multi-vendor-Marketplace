import { authTokenService } from '@/modules/auth/services/auth-token.service';
import bcrypt from 'bcrypt';
import { sessionService } from '@/modules/auth/services/session.service';
import { mailJob } from '@/jobs/mail/mail.job';
import { tokenUtils } from '@/shared/utils/jwt';
import { UserRole } from '@prisma/client';
import { AppError } from '@/shared/utils/AppError';
import { StatusCodes } from 'http-status-codes';
import { MESSAGE } from '@/shared/constants/message.constants';
import { v4 as uuidv4 } from 'uuid';
import { AuthService } from '@/modules/auth/auth.service';

jest.mock('@/modules/auth/services/session.service', () => ({
  sessionService: {
    createSession: jest.fn(),
    getSession: jest.fn(),
    deleteSession: jest.fn(),
    deleteAllSessions: jest.fn(),
    markTokenAsUsed: jest.fn(),
    getUsedTokenOwner: jest.fn(),
  },
}));

jest.mock('@/modules/auth/services/auth-token.service', () => ({
  authTokenService: {
    saveVerifyEmailToken: jest.fn(),
    getUserIdByVerifyToken: jest.fn(),
    deleteVerifyEmailToken: jest.fn(),
    saveResetPasswordToken: jest.fn(),
    getUserIdByResetToken: jest.fn(),
    deleteResetPasswordToken: jest.fn(),
  },
}));

jest.mock('@/jobs/mail/mail.job', () => ({
  mailJob: {
    sendWelcomeRegistration: jest.fn(),
    sendForgotPassword: jest.fn(),
  },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

jest.mock('@/shared/utils/jwt', () => ({
  tokenUtils: {
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
  },
}));

describe('authService', () => {
  let mockUserRepo: any;
  let authService: AuthService;

  const userId = 'user-01';
  const email = 'test@example.com';
  const tokenId = 'uuid-token-id';
  const fullName = 'Test User';
  const password = 'password123';
  const user = {
    id: userId,
    email: email,
    password: 'hashedPassword',
    role: UserRole.USER,
    fullName: fullName,
    isVerified: true,
  };

  beforeEach(() => {
    mockUserRepo = {
      getProfileById: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      updatePassword: jest.fn(),
      findByEmail: jest.fn(),
      markEmailAsVerified: jest.fn(),
    };

    authService = new AuthService(mockUserRepo)
  })

  describe('register()', () => {
    it('should throw error if email already exists', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(user);

      const promise = authService.register(email, password, fullName);

      await expect(promise).rejects.toThrow(AppError);
      expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.CONFLICT,
        message: MESSAGE.AUTH.EMAIL_ALREADY_EXISTS,
      });

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockUserRepo.createUser).not.toHaveBeenCalled();
      expect(uuidv4).not.toHaveBeenCalled();
      expect(authTokenService.saveResetPasswordToken).not.toHaveBeenCalled();
      expect(mailJob.sendWelcomeRegistration).not.toHaveBeenCalled();
    });

    it('should register successfully and send verification email', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(user.password);
      mockUserRepo.createUser.mockResolvedValue(user);
      (uuidv4 as jest.Mock).mockReturnValue(tokenId);

      await authService.register(email, password, fullName);

      expect(authTokenService.saveVerifyEmailToken).toHaveBeenCalledWith(userId, tokenId);
      expect(mailJob.sendWelcomeRegistration).toHaveBeenCalledWith({
        to: email,
        fullName,
        token: tokenId,
      });
    });
  });

  describe('verifyEmail()', () => {
    it('should throw error if token is invalid or expired', async () => {
      (authTokenService.getUserIdByVerifyToken as jest.Mock).mockResolvedValue(null);

      const promise = authService.verifyEmail(tokenId);

      await expect(promise).rejects.toThrow(AppError);
      expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.BAD_REQUEST,
        message: MESSAGE.AUTH.INVALID_OR_EXPIRED_TOKEN,
      });
      expect(mockUserRepo.markEmailAsVerified).not.toHaveBeenCalled();
      expect(authTokenService.deleteVerifyEmailToken).not.toHaveBeenCalled();
    });

    it('should verify email successfully and mark user as verified', async () => {
      (authTokenService.getUserIdByVerifyToken as jest.Mock).mockResolvedValue(userId);

      await authService.verifyEmail(tokenId);

      expect(mockUserRepo.markEmailAsVerified).toHaveBeenCalledWith(userId);
      expect(authTokenService.deleteVerifyEmailToken).toHaveBeenCalledWith(tokenId);
    });
  });

  describe('login()', () => {
    it('should throw error if user is not exist', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);
      /**
       * jest.spyOn() dùng để theo dõi một function mà không phá logic thật của nó
       * jest.spyOn(object, methodName)
       * object: nơi chứa function (object/module/class)
       * methodName: tên function muốn theo dõi
       */
      const spy = jest.spyOn(authService, 'generateAndStoreTokens');
      const promise = authService.login(email, password);

      await expect(promise).rejects.toThrow(AppError);
      expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.UNAUTHORIZED,
        message: MESSAGE.AUTH.INVALID_CREDENTIALS,
      });

      expect(spy).not.toHaveBeenCalled();
    });

    it('should throw error if password is incorrect', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const spy = jest.spyOn(authService, 'generateAndStoreTokens');
      const promise = authService.login(email, password);

      await expect(promise).rejects.toThrow(AppError);
      expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.UNAUTHORIZED,
        message: MESSAGE.AUTH.INVALID_CREDENTIALS,
      });

      expect(spy).not.toHaveBeenCalled();
    });

    it('should throw error if email is not verified', async () => {
      user.isVerified = false;
      mockUserRepo.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const spy = jest.spyOn(authService, 'generateAndStoreTokens');
      const promise = authService.login(email, password);

      await expect(promise).rejects.toThrow(AppError);
      expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.FORBIDDEN,
      });

      expect(spy).not.toHaveBeenCalled();
    });

    it('should login successfully and return tokens', async () => {
      user.isVerified = true;
      mockUserRepo.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const spy = jest.spyOn(authService, 'generateAndStoreTokens');
      const result = await authService.login(email, password);
      // console.log(user);

      expect(spy).toHaveBeenCalledWith(userId, user.role);
      expect(result).toMatchObject({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
        },
      });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('logout()', () => {
    it('should logout successfully and delete session', async () => {
      (tokenUtils.verifyRefreshToken as jest.Mock).mockReturnValue({
        sub: userId,
        tokenId,
      });
      await authService.logout(tokenId);

      expect(tokenUtils.verifyRefreshToken).toHaveBeenCalledWith(tokenId);
      expect(sessionService.deleteSession).toHaveBeenCalledWith(userId, tokenId);
    });
  });

  describe('refreshToken()', () => {
    const oldRefreshToken = 'old-token';
    const decoded = { sub: userId, role: UserRole.USER, tokenId };

    it('should throw security breach and delete all sessions if tokenId was already used', async () => {
      (tokenUtils.verifyRefreshToken as jest.Mock).mockReturnValue(decoded);
      (sessionService.getUsedTokenOwner as jest.Mock).mockResolvedValue(userId);

      const promise = authService.refreshToken(oldRefreshToken);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.FORBIDDEN,
        message: MESSAGE.AUTH.SECURITY_BREACH,
      });

      expect(sessionService.deleteAllSessions).toHaveBeenCalledWith(userId);
      expect(sessionService.getSession).not.toHaveBeenCalled();
      expect(sessionService.markTokenAsUsed).not.toHaveBeenCalled();
      expect(sessionService.deleteSession).not.toHaveBeenCalled();
    });

    it('should throw session expired if session does not exist in Redis', async () => {
      (tokenUtils.verifyRefreshToken as jest.Mock).mockReturnValue(decoded);
      (sessionService.getUsedTokenOwner as jest.Mock).mockResolvedValue(null);
      (sessionService.getSession as jest.Mock).mockResolvedValue(null);

      const promise = authService.refreshToken(oldRefreshToken);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.UNAUTHORIZED,
        message: MESSAGE.AUTH.SESSION_EXPIRED,
      });

      expect(sessionService.markTokenAsUsed).not.toHaveBeenCalled();
      expect(sessionService.deleteSession).not.toHaveBeenCalled();
    });

    it('should throw security breach and delete all sessions if saved token mismatch with oldRefreshToken', async () => {
      (tokenUtils.verifyRefreshToken as jest.Mock).mockReturnValue(decoded);
      (sessionService.getUsedTokenOwner as jest.Mock).mockResolvedValue(null);
      (sessionService.getSession as jest.Mock).mockResolvedValue('saved-token');

      const promise = authService.refreshToken(oldRefreshToken);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.FORBIDDEN,
        message: MESSAGE.AUTH.SECURITY_BREACH,
      });

      expect(sessionService.deleteAllSessions).toHaveBeenCalledWith(userId);
      expect(sessionService.markTokenAsUsed).not.toHaveBeenCalled();
      expect(sessionService.deleteSession).not.toHaveBeenCalled();
    });

    it('should rotate tokens successfully (mark used, delete old, and generate new)', async () => {
      (tokenUtils.verifyRefreshToken as jest.Mock).mockReturnValue(decoded);
      (sessionService.getUsedTokenOwner as jest.Mock).mockResolvedValue(null);
      (sessionService.getSession as jest.Mock).mockResolvedValue(oldRefreshToken);

      const spy = jest.spyOn(authService, 'generateAndStoreTokens');

      await authService.refreshToken(oldRefreshToken);

      expect(sessionService.markTokenAsUsed).toHaveBeenCalledWith(tokenId, userId);
      expect(sessionService.deleteSession).toHaveBeenCalledWith(userId, tokenId);

      // Kiểm tra gọi hàm cấp token mới
      expect(spy).toHaveBeenCalledWith(userId, user.role);
    });
  });

  describe('forgotPassword()', () => {
    it('should throw error if email is not exist', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      const promise = authService.forgotPassword(email);
      await expect(promise).rejects.toThrow(AppError);
      expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.NOT_FOUND,
        message: MESSAGE.AUTH.NOT_FOUND_EMAIL,
      });
      expect(uuidv4).not.toHaveBeenCalled();
      expect(authTokenService.saveResetPasswordToken).not.toHaveBeenCalled();
      expect(mailJob.sendForgotPassword).not.toHaveBeenCalled();
    });

    it('should send forgot password email when user exists', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(user);
      (uuidv4 as jest.Mock).mockReturnValue(tokenId);

      await authService.forgotPassword(email);

      expect(authTokenService.saveResetPasswordToken).toHaveBeenCalledWith(user.id, tokenId);
      expect(mailJob.sendForgotPassword).toHaveBeenCalledWith({
        to: user.email,
        fullName: user.fullName,
        token: tokenId,
      });
    });
  });

  describe('resetPassword()', () => {
    it('should throw error if email is not exist', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      const promise = authService.resetPassword(tokenId, password);
      await expect(promise).rejects.toThrow(AppError);
      expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.BAD_REQUEST,
        message: MESSAGE.AUTH.INVALID_OR_EXPIRED_TOKEN,
      });
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockUserRepo.updatePassword).not.toHaveBeenCalled();
      expect(authTokenService.deleteResetPasswordToken).not.toHaveBeenCalled();
      expect(sessionService.deleteAllSessions).not.toHaveBeenCalled();
    });

    it('should reset password and delete all sessions when user exists', async () => {
      (authTokenService.getUserIdByResetToken as jest.Mock).mockResolvedValue(userId);
      (bcrypt.hash as jest.Mock).mockResolvedValue(user.password);

      await authService.resetPassword(tokenId, password);

      expect(mockUserRepo.updatePassword).toHaveBeenCalledWith(userId, user.password);
      expect(authTokenService.deleteResetPasswordToken).toHaveBeenCalledWith(tokenId);
      expect(sessionService.deleteAllSessions).toHaveBeenCalledWith(userId);
    });
  });
});
