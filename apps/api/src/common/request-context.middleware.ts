import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export type RequestWithId = Request & { id?: string };

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{8,64}$/;
const QUIET_PATHS = /^\/health(\/|$)/;

/**
 * Assigns every request an id (honouring a sane inbound `X-Request-Id`), echoes it back on the
 * response, and logs one line per finished request with method, path, status and duration.
 */
export function requestContext() {
  const logger = new Logger('HTTP');

  return (request: RequestWithId, response: Response, next: NextFunction): void => {
    const inbound = request.header('x-request-id');
    const id = inbound && SAFE_REQUEST_ID.test(inbound) ? inbound : randomUUID();
    request.id = id;
    response.setHeader('X-Request-Id', id);

    const startedAt = process.hrtime.bigint();
    response.on('finish', () => {
      const path = request.originalUrl.split('?')[0] ?? request.originalUrl;
      if (QUIET_PATHS.test(path) && response.statusCode < 400) {
        return;
      }

      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const line = `${request.method} ${path} ${response.statusCode} ${durationMs.toFixed(1)}ms requestId=${id}`;

      if (response.statusCode >= 500) {
        logger.error(line);
      } else if (response.statusCode >= 400) {
        logger.warn(line);
      } else {
        logger.log(line);
      }
    });

    next();
  };
}
