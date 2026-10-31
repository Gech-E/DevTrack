import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RateLimitGuard } from './common/rate-limit/rate-limit.guard';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './database/prisma.module';
import { GoalsModule } from './goals/goals.module';
import { HealthModule } from './health/health.module';
import { MailModule } from './mail/mail.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
    }),
    PrismaModule,
    MailModule,
    HealthModule,
    AuthModule,
    ProjectsModule,
    TasksModule,
    GoalsModule,
  ],
  providers: [
    // Order matters: throttle first so unauthenticated floods are rejected before JWT work.
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
