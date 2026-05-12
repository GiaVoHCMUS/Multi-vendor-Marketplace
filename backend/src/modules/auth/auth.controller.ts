import { Request, Response } from 'express';
import { successResponse } from '../../shared/utils/response';
import { AppError } from '@/shared/utils/AppError';
import { refreshTokenCookieOptions } from '@/shared/utils/cookie';
import { MESSAGE } from '@/shared/constants/message.constants';
import { StatusCodes } from 'http-status-codes';
import { AuthService } from './auth.service';

export class AuthController {
  constructor (private readonly authService: AuthService) {}

  register = async (req: Request, res: Response) => {
    const { email, password, fullName } = req.body;
    await this.authService.register(email, password, fullName);

    successResponse(res, StatusCodes.CREATED, MESSAGE.AUTH.REGISTER_SUCCESS);
  }

  login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await this.authService.login(email, password);

    const { refreshToken, accessToken, user } = result;

    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);
    successResponse(res, StatusCodes.OK, MESSAGE.AUTH.LOGIN_SUCCESS, {
      user,
      accessToken,
    });
  }

  logout = async (req: Request, res: Response) => {
    const refreshToken: string = req.cookies.refreshToken;
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth/refresh-token',
    });

    successResponse(res, StatusCodes.OK, MESSAGE.AUTH.LOGOUT_SUCCESS);
  }

  refreshToken= async (req: Request, res: Response) => {
    const refreshToken: string = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new AppError(MESSAGE.AUTH.REFRESH_TOKEN_NOT_FOUND, StatusCodes.UNAUTHORIZED);
    }

    const tokens = await this.authService.refreshToken(refreshToken);

    res.cookie('refreshToken', tokens.refreshToken, refreshTokenCookieOptions);

    successResponse(res, StatusCodes.OK, MESSAGE.AUTH.REFRESH_TOKEN_SUCCESS, {
      accessToken: tokens.accessToken,
    });
  }

  forgotPassword= async (req: Request, res: Response) => {
    const { email } = req.body;
    await this.authService.forgotPassword(email);

    successResponse(res, StatusCodes.OK, MESSAGE.AUTH.FORGOT_PASSWORD_SUCCESS);
  }

  resetPassword= async (req: Request, res: Response) => {
    const { token, password } = req.body;
    await this.authService.resetPassword(token, password);

    successResponse(res, StatusCodes.OK, MESSAGE.AUTH.RESET_PASSWORD_SUCCESS);
  }

  verifyEmail= async (req: Request, res: Response) => {
    const { token } = req.query;
    await this.authService.verifyEmail(token as string);

    successResponse(res, StatusCodes.OK, MESSAGE.AUTH.VERIFY_EMAIL_SUCCESS);
  }
};
