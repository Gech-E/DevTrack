import {
  type ArgumentsHost,
  BadRequestException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AllExceptionsFilter } from './all-exceptions.filter';

function run(exception: unknown) {
  const json = jest.fn();
  const status = jest.fn((_code: number) => ({ json }));
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ id: 'req-12345678', method: 'GET', originalUrl: '/api/v1/x?secret=1' }),
      getResponse: () => ({ status, headersSent: false }),
    }),
  } as unknown as ArgumentsHost;

  new AllExceptionsFilter().catch(exception, host);

  return { status: status.mock.calls[0]?.[0], body: json.mock.calls[0]?.[0] };
}

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('boom', { code, clientVersion: 'test' });

describe('AllExceptionsFilter', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps Nest HTTP exceptions and adds the request id', () => {
    const { status, body } = run(new NotFoundException('Project not found'));

    expect(status).toBe(404);
    expect(body).toMatchObject({
      statusCode: 404,
      message: 'Project not found',
      requestId: 'req-12345678',
    });
  });

  it('preserves validation message arrays', () => {
    const { status, body } = run(new BadRequestException(['title must be a string']));

    expect(status).toBe(400);
    expect(body.message).toEqual(['title must be a string']);
  });

  it.each([
    ['P2002', HttpStatus.CONFLICT],
    ['P2025', HttpStatus.NOT_FOUND],
    ['P2003', HttpStatus.BAD_REQUEST],
  ])('maps Prisma %s to HTTP %i', (code, expected) => {
    expect(run(prismaError(code)).status).toBe(expected);
  });

  it('hides the details of unexpected errors', () => {
    const { status, body } = run(new Error('relation "users" does not exist'));

    expect(status).toBe(500);
    expect(body.message).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toContain('relation');
  });

  it('passes through 4xx errors raised by the HTTP layer', () => {
    const { status, body } = run(Object.assign(new Error('Unexpected token'), { status: 400 }));

    expect(status).toBe(400);
    expect(body.message).toBe('Unexpected token');
  });
});
