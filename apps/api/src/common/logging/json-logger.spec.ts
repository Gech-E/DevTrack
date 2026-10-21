import { JsonLogger } from './json-logger';

function capture(stream: 'stdout' | 'stderr', run: () => void): Record<string, unknown> {
  const spy = jest.spyOn(process[stream], 'write').mockImplementation(() => true);
  try {
    run();
    return JSON.parse(String(spy.mock.calls[0]?.[0])) as Record<string, unknown>;
  } finally {
    spy.mockRestore();
  }
}

describe('JsonLogger', () => {
  const logger = new JsonLogger();

  it('writes one JSON object per line with level, time and context', () => {
    const entry = capture('stdout', () => logger.log('Server started', 'Bootstrap'));

    expect(entry).toMatchObject({ level: 'log', message: 'Server started', context: 'Bootstrap' });
    expect(typeof entry.time).toBe('string');
  });

  it('keeps the message and stack of Error objects instead of printing {}', () => {
    const error = new Error('Invalid environment configuration: JWT_SECRET must be set');
    const entry = capture('stderr', () => logger.error(error, 'ExceptionHandler'));

    expect(entry.level).toBe('error');
    expect(entry.message).toBe('Invalid environment configuration: JWT_SECRET must be set');
    expect(String(entry.stack)).toContain('Error');
    expect(entry.context).toBe('ExceptionHandler');
  });

  it('separates stack from context for logger.error(message, stack, context)', () => {
    const entry = capture('stderr', () => logger.error('boom', 'stack-trace-text', 'Service'));

    expect(entry).toMatchObject({ message: 'boom', stack: 'stack-trace-text', context: 'Service' });
  });

  it('serialises plain objects', () => {
    const entry = capture('stdout', () => logger.warn({ reason: 'slow' }, 'Ctx'));

    expect(entry.message).toBe('{"reason":"slow"}');
  });
});
