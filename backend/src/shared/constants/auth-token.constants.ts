const PREFIX = 'marketplace';

export const AUTH_TOKEN_KEYS = {
  verifyEmail: (token: string) => `${PREFIX}:verify-email:${token}`,

  resetPassword: (token: string) => `${PREFIX}:reset-password:${token}`,
};

export const AUTH_TOKEN_TTL = {
  VERIFY_EMAIL: 10 * 60,
  RESET_PASSWORD: 10 * 60,
};
