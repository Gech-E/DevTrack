import 'reflect-metadata';
import { plainToInstance, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export const NODE_ENVS = ['development', 'test', 'production'] as const;
export type NodeEnv = (typeof NODE_ENVS)[number];

export const MAIL_TRANSPORTS = ['log', 'resend'] as const;
export type MailTransport = (typeof MAIL_TRANSPORTS)[number];

/** Values that must never be accepted as a production signing secret. */
const WEAK_SECRET_PATTERN =
  /change[-_ ]?me|development-only|ci-test|e2e-|^(secret|password|default|example|test|dev|development)$/i;

/**
 * Typed, validated view of the process environment.
 * Defaults here are safe for local development; production adds stricter rules below.
 */
export class EnvironmentVariables {
  @IsIn(NODE_ENVS)
  NODE_ENV: NodeEnv = 'development';

  @IsString()
  @MinLength(1, { message: 'DATABASE_URL must be set' })
  DATABASE_URL!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  API_PORT = 3001;

  @IsString()
  @MinLength(8, { message: 'JWT_SECRET must be set (at least 8 characters)' })
  JWT_SECRET!: string;

  @IsString()
  @MinLength(1)
  JWT_ISSUER = 'devtrack-api';

  @IsString()
  @MinLength(1)
  JWT_AUDIENCE = 'devtrack-web';

  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  /** Number of reverse proxies in front of the API (0 = none). Needed for correct client IPs. */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  TRUST_PROXY_HOPS = 0;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3600)
  RATE_LIMIT_WINDOW_SECONDS = 60;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  RATE_LIMIT_GLOBAL_MAX = 300;

  /** Login, register and token refresh. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  RATE_LIMIT_AUTH_MAX = 20;

  /** Password reset, password change and account deletion. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  RATE_LIMIT_SENSITIVE_MAX = 5;

  @IsString()
  @MinLength(1)
  WEB_APP_URL = 'http://localhost:3000';

  @IsIn(MAIL_TRANSPORTS)
  MAIL_TRANSPORT: MailTransport = 'log';

  @IsOptional()
  @IsString()
  MAIL_FROM?: string;

  @IsOptional()
  @IsString()
  RESEND_API_KEY?: string;
}

function distinctCharacters(value: string): number {
  return new Set(value).size;
}

function isHttpOrigin(value: string): boolean {
  return /^https?:\/\/[^\s*/]+(:\d+)?$/.test(value);
}

/** Cross-field and production-only rules that decorators cannot express. */
export function collectEnvProblems(env: EnvironmentVariables): string[] {
  const problems: string[] = [];

  if (env.DATABASE_URL && !/^postgres(ql)?:\/\//.test(env.DATABASE_URL)) {
    problems.push('DATABASE_URL must be a postgres:// or postgresql:// connection string');
  }

  if (env.MAIL_TRANSPORT === 'resend') {
    if (!env.RESEND_API_KEY) problems.push('RESEND_API_KEY is required when MAIL_TRANSPORT=resend');
    if (!env.MAIL_FROM) problems.push('MAIL_FROM is required when MAIL_TRANSPORT=resend');
  }

  if (env.NODE_ENV !== 'production') {
    return problems;
  }

  const secret = env.JWT_SECRET ?? '';
  if (secret.length < 32) {
    problems.push('JWT_SECRET must be at least 32 characters in production');
  }
  if (WEAK_SECRET_PATTERN.test(secret) || distinctCharacters(secret) < 10) {
    problems.push(
      'JWT_SECRET looks like a default or low-entropy value; generate one with `openssl rand -base64 48`',
    );
  }

  const origins = (env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.length === 0) {
    problems.push('CORS_ORIGINS must list the allowed web origin(s) in production');
  } else if (!origins.every(isHttpOrigin)) {
    problems.push('CORS_ORIGINS entries must be http(s) origins without wildcards or paths');
  }

  if (!/^https?:\/\//.test(env.WEB_APP_URL)) {
    problems.push('WEB_APP_URL must be an absolute http(s) URL in production');
  }

  return problems;
}

/** Used as `ConfigModule.forRoot({ validate })`; throws with every problem so boot fails fast. */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const parsed = plainToInstance(EnvironmentVariables, config);
  const errors = validateSync(parsed);

  const problems = errors.flatMap((error) => Object.values(error.constraints ?? {}));
  problems.push(...collectEnvProblems(parsed));

  if (problems.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`,
    );
  }

  const definedEntries = Object.entries(parsed).filter(([, value]) => value !== undefined);
  return { ...config, ...Object.fromEntries(definedEntries) };
}
