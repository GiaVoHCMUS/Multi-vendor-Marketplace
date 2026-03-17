import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/catchAsync';
import { successResponse } from '../../shared/utils/response';
import { authService } from './auth.service';
import { AppError } from '@/shared/utils/AppError';
import { refreshTokenCookieOptions } from '@/shared/utils/cookie';
import { MESSAGE } from '@/shared/constants/message.constants';

export const authController = {
  register: catchAsync(async (req: Request, res: Response) => {
    const { email, password, fullName } = req.body;
    const result = await authService.register(email, password, fullName);

    const { refreshToken, accessToken, user } = result;

    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);

    successResponse(res, 201, MESSAGE.AUTH.REGISTER_SUCCESS, {
      user,
      accessToken,
    });
  }),

  login: catchAsync(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    const { refreshToken, accessToken, user } = result;

    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);
    successResponse(res, 200, MESSAGE.AUTH.LOGIN_SUCCESS, {
      user,
      accessToken,
    });
  }),

  logout: catchAsync(async (req: Request, res: Response) => {
    const refreshToken: string = req.cookies.refreshToken;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth/refresh-token',
    });

    successResponse(res, 200, MESSAGE.AUTH.LOGOUT_SUCCESS);
  }),

  refreshToken: catchAsync(async (req: Request, res: Response) => {
    const refreshToken: string = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new AppError(MESSAGE.AUTH.REFRESH_TOKEN_NOT_FOUND, 401);
    }

    const tokens = await authService.refreshToken(refreshToken);

    res.cookie('refreshToken', tokens.refreshToken, refreshTokenCookieOptions);

    successResponse(res, 200, MESSAGE.AUTH.REFRESH_TOKEN_SUCCESS, {
      accessToken: tokens.accessToken,
    });
  }),
};
