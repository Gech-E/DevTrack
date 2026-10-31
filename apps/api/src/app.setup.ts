import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { requestContext } from './common/request-context.middleware';
import { securityHeaders } from './common/security-headers.middleware';

const DEV_CORS_ORIGINS = ['http://localhost:3000', 'http://localhost:3101'];

export function resolveCorsOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return DEV_CORS_ORIGINS;
  }
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * Everything that makes the app behave like production: prefix, validation, error shape,
 * headers, CORS and shutdown handling. `main.ts` and the e2e tests both call this so tests
 * cannot drift from the real bootstrap.
 */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get(ConfigService);
  const isProduction = config.get<string>('NODE_ENV') === 'production';

  app.disable('x-powered-by');

  const proxyHops = config.get<number>('TRUST_PROXY_HOPS', 0);
  if (proxyHops > 0) {
    app.set('trust proxy', proxyHops);
  }

  app.use(requestContext());
  app.use(securityHeaders({ hsts: isProduction }));

  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/live', 'health/ready'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: resolveCorsOrigins(config.get<string>('CORS_ORIGINS')),
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'Retry-After'],
    maxAge: 600,
  });

  // Lets Nest run onModuleDestroy (and so disconnect Prisma) on SIGTERM/SIGINT.
  app.enableShutdownHooks();
}
