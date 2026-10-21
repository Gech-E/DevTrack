import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';

import { RATE_LIMIT_KEY, SKIP_RATE_LIMIT_KEY, type RateLimitBucket } from './rate-limit.decorator';
import { RateLimitStore } from './rate-limit.store';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly store = new RateLimitStore();

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') {
      return true;
    }

    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean | undefined>(SKIP_RATE_LIMIT_KEY, targets)) {
      return true;
    }

    const bucket =
      this.reflector.getAllAndOverride<RateLimitBucket | undefined>(RATE_LIMIT_KEY, targets) ??
      'global';

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const client = request.ip ?? request.socket?.remoteAddress ?? 'unknown';
    const routeKey =
      bucket === 'global' ? 'all' : `${context.getClass().name}.${context.getHandler().name}`;

    const windowSeconds = this.config.get<number>('RATE_LIMIT_WINDOW_SECONDS', 60);
    const result = this.store.hit(
      `${bucket}:${routeKey}:${client}`,
      this.limitFor(bucket),
      windowSeconds * 1000,
    );

    response.setHeader('X-RateLimit-Limit', String(result.limit));
    response.setHeader('X-RateLimit-Remaining', String(result.remaining));

    if (!result.allowed) {
      response.setHeader('Retry-After', String(result.retryAfterSeconds));
      throw new HttpException(
        'Too many requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private limitFor(bucket: RateLimitBucket): number {
    switch (bucket) {
      case 'auth':
        return this.config.get<number>('RATE_LIMIT_AUTH_MAX', 20);
      case 'sensitive':
        return this.config.get<number>('RATE_LIMIT_SENSITIVE_MAX', 5);
      default:
        return this.config.get<number>('RATE_LIMIT_GLOBAL_MAX', 300);
    }
  }
}
