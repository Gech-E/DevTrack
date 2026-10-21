import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { APP_NAME } from '@devtrack/shared';

import { Public } from '../common/public.decorator';
import { SkipRateLimit } from '../common/rate-limit/rate-limit.decorator';
import { HealthService } from './health.service';

@Public()
@SkipRateLimit()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /** Same as readiness; kept so existing probes and docs continue to work. */
  @Get()
  getHealth() {
    return this.readiness();
  }

  /** Liveness: the process is up. Never touches the database, so a DB outage does not restart pods. */
  @Get('live')
  live() {
    return { status: 'ok', service: APP_NAME, timestamp: new Date().toISOString() };
  }

  /** Readiness: 503 while the database is unreachable so load balancers stop sending traffic. */
  @Get('ready')
  ready() {
    return this.readiness();
  }

  private async readiness() {
    const health = await this.healthService.getHealth();
    if (health.status !== 'ok') {
      throw new ServiceUnavailableException(health);
    }
    return health;
  }
}
