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

    const formatted = this.format(message);
    const entry = {
      level,
      time: new Date().toISOString(),
      context,
      message: formatted.message,
      stack: formatted.stack ?? stack,
    };

    const stream = level === 'error' ? process.stderr : process.stdout;
    stream.write(`${JSON.stringify(entry)}\n`);
  }

  /** Error objects have no enumerable fields, so JSON.stringify(error) would print "{}". */
  private format(message: unknown): { message: string; stack?: string } {
    if (message instanceof Error) {
      return { message: message.message, stack: message.stack };
    }
    if (typeof message === 'string') {
      return { message };
    }
    try {
      return { message: JSON.stringify(message) };
    } catch {
      return { message: String(message) };
    }
  }
}
