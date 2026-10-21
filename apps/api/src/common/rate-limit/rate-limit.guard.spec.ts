import { HttpException, type ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

import { RateLimit, SkipRateLimit } from './rate-limit.decorator';
import { RateLimitGuard } from './rate-limit.guard';

class SampleController {
  @RateLimit('auth')
  login(): void {}

  @RateLimit('sensitive')
  resetPassword(): void {}

  @SkipRateLimit()
  health(): void {}

  list(): void {}
}

function build(values: Record<string, number> = {}) {
  const config = {
    get: (key: string, fallback?: number) => values[key] ?? fallback,
  } as unknown as ConfigService;
  return new RateLimitGuard(new Reflector(), config);
}

function contextFor(handler: () => void, ip = '203.0.113.7') {
  const headers: Record<string, string> = {};
  const response = {
    setHeader: (name: string, value: string) => {
      headers[name] = value;
    },
  };
  const context = {
    getType: () => 'http',
    getHandler: () => handler,
    getClass: () => SampleController,
    switchToHttp: () => ({ getRequest: () => ({ ip }), getResponse: () => response }),
  } as unknown as ExecutionContext;
  return { context, headers };
}

describe('RateLimitGuard', () => {
  const controller = SampleController.prototype;

  it('blocks the request after the auth limit with 429 and Retry-After', () => {
    const guard = build({ RATE_LIMIT_AUTH_MAX: 2 });

    expect(guard.canActivate(contextFor(controller.login).context)).toBe(true);
    expect(guard.canActivate(contextFor(controller.login).context)).toBe(true);

    const blocked = contextFor(controller.login);
    expect(() => guard.canActivate(blocked.context)).toThrow(HttpException);
    expect(Number(blocked.headers['Retry-After'])).toBeGreaterThan(0);
  });

  it('tracks clients and routes separately', () => {
    const guard = build({ RATE_LIMIT_AUTH_MAX: 1, RATE_LIMIT_SENSITIVE_MAX: 1 });

    expect(guard.canActivate(contextFor(controller.login, '198.51.100.1').context)).toBe(true);
    expect(guard.canActivate(contextFor(controller.login, '198.51.100.2').context)).toBe(true);
    expect(guard.canActivate(contextFor(controller.resetPassword, '198.51.100.1').context)).toBe(
      true,
    );
  });

  it('applies the global limit to routes without a bucket', () => {
    const guard = build({ RATE_LIMIT_GLOBAL_MAX: 1 });

    expect(guard.canActivate(contextFor(controller.list).context)).toBe(true);
    expect(() => guard.canActivate(contextFor(controller.list).context)).toThrow(HttpException);
  });

  it('never throttles routes marked with SkipRateLimit', () => {
    const guard = build({ RATE_LIMIT_GLOBAL_MAX: 1 });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(guard.canActivate(contextFor(controller.health).context)).toBe(true);
    }
  });
});
