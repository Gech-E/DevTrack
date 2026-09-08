import { Injectable } from '@nestjs/common';
import { APP_NAME, type HealthStatus } from '@devtrack/shared';

import { PrismaService } from '../database/prisma.service';

export type HealthResponse = {
  status: HealthStatus;
  service: typeof APP_NAME;
  timestamp: string;
  database: 'up' | 'down';
};

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<HealthResponse> {
    const databaseUp = await this.prisma.isHealthy();

    return {
      status: databaseUp ? 'ok' : 'degraded',
      service: APP_NAME,
      timestamp: new Date().toISOString(),
      database: databaseUp ? 'up' : 'down',
    };
  }
}
