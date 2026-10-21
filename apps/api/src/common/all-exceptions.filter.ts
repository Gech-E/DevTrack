import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

import type { RequestWithId } from './request-context.middleware';

type ErrorBody = Record<string, unknown> & { statusCode: number; message: unknown };

function fromPrisma(error: Prisma.PrismaClientKnownRequestError): ErrorBody | null {
  switch (error.code) {
    case 'P2002':
      return {
        statusCode: HttpStatus.CONFLICT,
        message: 'A record with these values already exists',
        error: 'Conflict',
      };
    case 'P2025':
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
        error: 'Not Found',
      };
    case 'P2003':
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'A referenced record does not exist',
        error: 'Bad Request',
      };
    default:
      return null;
  }
}

/** Errors from the HTTP layer (for example body-parser) carry a 4xx status but are not Nest exceptions. */
function fromHttpLikeError(exception: unknown): ErrorBody | null {
  if (typeof exception !== 'object' || exception === null) {
    return null;
  }
  const candidate = exception as { status?: unknown; statusCode?: unknown; message?: unknown };
  const status = typeof candidate.status === 'number' ? candidate.status : candidate.statusCode;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return {
      statusCode: status,
      message: typeof candidate.message === 'string' ? candidate.message : 'Bad request',
    };
  }
  return null;
}

function toBody(exception: unknown): ErrorBody {
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const response = exception.getResponse();
    return typeof response === 'string'
      ? { statusCode: status, message: response }
      : { statusCode: status, ...response, message: (response as ErrorBody).message };
  }

  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = fromPrisma(exception);
    if (mapped) {
      return mapped;
    }
  }

  return (
    fromHttpLikeError(exception) ?? {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    }
  );
}

/**
 * Single place that turns every thrown error into the API's JSON error shape.
 * Unknown errors are logged with their stack but never leaked to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<Response>();

    const body = toBody(exception);
    const requestId = request.id;

    if (body.statusCode >= 500) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        `${request.method} ${request.originalUrl.split('?')[0]} -> ${body.statusCode} (requestId=${requestId ?? 'n/a'})`,
        stack,
      );
    }

    if (response.headersSent) {
      return;
    }

    response.status(body.statusCode).json({ ...body, requestId });
  }
}
