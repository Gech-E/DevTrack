import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { JsonLogger } from './common/logging/json-logger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: process.env.NODE_ENV === 'production' ? new JsonLogger() : undefined,
    // Let startup failures (such as invalid configuration) reject so the catch below can print
    // them and exit with status 1, instead of Nest calling process.abort().
    abortOnError: false,
  });

  configureApp(app);

  const port = app.get(ConfigService).get<number>('API_PORT', 3001);
  await app.listen(port);
  new Logger('Bootstrap').log(`DevTrack API listening on port ${port}`);
}

bootstrap().catch((error: unknown) => {
  // Invalid configuration lands here; print it plainly and exit non-zero so the platform restarts/alerts.
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
