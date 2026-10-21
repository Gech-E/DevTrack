import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'devtrack:rate-limit';
export const SKIP_RATE_LIMIT_KEY = 'devtrack:skip-rate-limit';

/**
 * - `global`: default for every route, shared per client IP.
 * - `auth`: login, register and token refresh, counted per route and IP.
 * - `sensitive`: password reset/change and account deletion, counted per route and IP.
 */
export type RateLimitBucket = 'global' | 'auth' | 'sensitive';

export const RateLimit = (bucket: Exclude<RateLimitBucket, 'global'>) =>
  SetMetadata(RATE_LIMIT_KEY, bucket);

/** For liveness/readiness probes, which must never be throttled. */
export const SkipRateLimit = () => SetMetadata(SKIP_RATE_LIMIT_KEY, true);
