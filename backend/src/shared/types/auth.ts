import { User, UserRole } from '@prisma/client';

export interface JwtAccessPayload {
  sub: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string;
  role: UserRole;
  tokenId: string;
  iat?: number;
  exp?: number;
}

export interface TokenPayload {
  accessToken: string;
  refreshToken: string;
}

export type UserWithoutPassword = Omit<User, 'password' | 'deletedAt'>;

export interface AuthResponse extends TokenPayload {
  user: UserWithoutPassword;
}
