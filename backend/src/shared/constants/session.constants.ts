const PREFIX = 'marketplace';

export const SESSION_TTL = {
  REFRESH_TOKEN_TTL: 14 * 24 * 60 * 60,
  USER_SESSIONS_TTL_BUFFER: 3600,
  RESUSE_DETECTION_TTL: 10 * 60,
};

export const SESSION_KEYS = {
  session: (userId: string, tokenId: string) =>
    `${PREFIX}:session:${userId}:${tokenId}`,
  userSessions: (userId: string) => `${PREFIX}:user_sessions:${userId}`,
  usedToken: (tokenId: string) => `${PREFIX}:used_token:${tokenId}`,
};
