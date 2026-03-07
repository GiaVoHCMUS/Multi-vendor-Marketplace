import jwt, { SignOptions } from 'jsonwebtoken';
import { AppJwtPayload } from '@/types/auth';

// Load env variable
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

if (!JWT_REFRESH_SECRET) {
  throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
}

const ACCESS_EXPIRES_IN =
  (process.env.ACCESS_TOKEN_EXPIRES as SignOptions['expiresIn']) || '15m';

const REFRESH_EXPIRES_IN =
  (process.env.REFRESH_TOKEN_EXPIRES as SignOptions['expiresIn']) || '14d';

// JWT Utility
export const tokenUtils = {
  // Generate Access Token
  generateAccessToken(userId: string, role?: string): string {
    const payload: AppJwtPayload = {
      id: userId,
      role,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_EXPIRES_IN,
    });
  },

  // Generate Refresh Token
  generateRefreshToken(userId: string): string {
    const payload: AppJwtPayload = {
      id: userId,
    };

    return jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: REFRESH_EXPIRES_IN,
    });
  },

  // Verify Access Token
  verifyAccessToken(token: string): AppJwtPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as AppJwtPayload;
    } catch {
      throw new Error('Invalid or expired access token');
    }
  },

  // Verify Refresh Token
  verifyRefreshToken(token: string): AppJwtPayload {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET) as AppJwtPayload;
    } catch {
      throw new Error('Invalid or expired refresh token');
    }
  },
};
