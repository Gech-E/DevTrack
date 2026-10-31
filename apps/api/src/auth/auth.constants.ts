export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

/**
 * A refresh token presented again shortly after it was rotated is usually two tabs racing, not
 * theft. Replays after this window revoke every session for the user.
 */
export const REFRESH_REUSE_GRACE_MS = 10_000;

export const BCRYPT_ROUNDS = 12;

export const JWT_ALGORITHM = 'HS256' as const;
export const DEFAULT_JWT_ISSUER = 'devtrack-api';
export const DEFAULT_JWT_AUDIENCE = 'devtrack-web';
