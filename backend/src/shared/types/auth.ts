import { UserRole } from '@prisma/client';

export interface JwtAccessPayload {
  sub: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string;
  iat?: number;
  exp?: number;
}
