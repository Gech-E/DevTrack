import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';

function resolveCorsOrigins(raw: string | undefined): string[] {
  const fallback = ['http://localhost:3000', 'http://localhost:3101'];
  if (!raw?.trim()) {
    return fallback;
  }
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const port = config.get<number>('API_PORT', 3001);

  app.use(cookieParser());

  app.setGlobalPrefix('api/v1', {
    exclude: ['health'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: resolveCorsOrigins(config.get<string>('CORS_ORIGINS')),
    credentials: true,
  });

  await app.listen(port);
  console.log(`DevTrack API listening on http://localhost:${port}`);
}

void bootstrap();
