import type { CookieOptions, Response } from 'express';
import type { ConfigService } from '@nestjs/config';

export const ACCESS_COOKIE = 'devtrack_access';
export const REFRESH_COOKIE = 'devtrack_refresh';

const ACCESS_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function isProduction(config: ConfigService): boolean {
  return config.get<string>('NODE_ENV') === 'production';
}

function baseCookieOptions(config: ConfigService): CookieOptions {
  const secure = isProduction(config);
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path: '/',
  };
}

export function setAuthCookies(
  res: Response,
  config: ConfigService,
  tokens: { accessToken: string; refreshToken: string },
): void {
  const base = baseCookieOptions(config);
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...base,
    maxAge: ACCESS_MAX_AGE_MS,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...base,
    maxAge: REFRESH_MAX_AGE_MS,
  });
}

export function clearAuthCookies(res: Response, config: ConfigService): void {
  const base = baseCookieOptions(config);
  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, base);
}
