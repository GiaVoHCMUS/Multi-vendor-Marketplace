import jwt, { SignOptions } from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { JwtAccessPayload, JwtRefreshPayload } from '../types/auth';

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
  generateAccessToken(userId: string, role: UserRole): string {
    const payload: JwtAccessPayload = {
      sub: userId,
      role,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_EXPIRES_IN,
    });
  },

  // Generate Refresh Token
  generateRefreshToken(
    userId: string,
    role: UserRole,
    tokenId: string,
  ): string {
    const payload: JwtRefreshPayload = {
      sub: userId,
      role,
      tokenId,
    };

    return jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: REFRESH_EXPIRES_IN,
    });
  },

  // Verify Access Token
  verifyAccessToken(token: string): JwtAccessPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as JwtAccessPayload;
    } catch {
      throw new Error('Invalid or expired access token');
    }
  },

  // Verify Refresh Token
  verifyRefreshToken(token: string): JwtRefreshPayload {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET) as JwtRefreshPayload;
    } catch {
      throw new Error('Invalid or expired refresh token');
    }
  },
};
