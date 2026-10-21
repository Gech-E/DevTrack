import type { LoggerService, LogLevel } from '@nestjs/common';

/**
 * One JSON object per line on stdout/stderr, ready for any log shipper.
 * Used in production; development keeps Nest's readable console logger.
 */
export class JsonLogger implements LoggerService {
  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write('log', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.write('error', message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write('verbose', message, optionalParams);
  }

  private write(level: LogLevel, message: unknown, params: unknown[]): void {
    const strings = params.filter((param): param is string => typeof param === 'string');
    const context = strings.length > 0 ? strings[strings.length - 1] : undefined;
    const stack = level === 'error' && strings.length > 1 ? strings[0] : undefined;

    const entry = {
      level,
      time: new Date().toISOString(),
      context,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      stack,
    };

    const stream = level === 'error' ? process.stderr : process.stdout;
    stream.write(`${JSON.stringify(entry)}\n`);
  }
}
