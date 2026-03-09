export const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth/refresh-token',
  maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
};
