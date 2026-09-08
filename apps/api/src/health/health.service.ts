import { Injectable } from '@nestjs/common';
import { APP_NAME, type HealthStatus } from '@devtrack/shared';

export type HealthResponse = {
  status: HealthStatus;
  service: typeof APP_NAME;
  timestamp: string;
};

@Injectable()
export class HealthService {
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: APP_NAME,
      timestamp: new Date().toISOString(),
    };
  }
}
