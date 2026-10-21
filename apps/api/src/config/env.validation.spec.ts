import { validateEnv } from './env.validation';

const STRONG_SECRET = 'kJ8vQ2mZp4xR7tYb1nWc6HdLs9GfAeUo3VqXi0MzTrBy';

const devEnv = {
  DATABASE_URL: 'postgresql://devtrack:devtrack@localhost:5432/devtrack',
  JWT_SECRET: 'local-dev-secret',
};

const productionEnv = {
  ...devEnv,
  NODE_ENV: 'production',
  JWT_SECRET: STRONG_SECRET,
  CORS_ORIGINS: 'https://app.devtrack.example',
  WEB_APP_URL: 'https://app.devtrack.example',
};

describe('validateEnv', () => {
  it('applies safe defaults and coerces numbers in development', () => {
    const result = validateEnv({ ...devEnv, API_PORT: '4000' });

    expect(result.API_PORT).toBe(4000);
    expect(result.NODE_ENV).toBe('development');
    expect(result.TRUST_PROXY_HOPS).toBe(0);
    expect(result.MAIL_TRANSPORT).toBe('log');
  });

  it('keeps unrelated environment variables intact', () => {
    expect(validateEnv({ ...devEnv, PATH: '/usr/bin' }).PATH).toBe('/usr/bin');
  });

  it('reports every missing required variable at once', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL must be set[\s\S]*JWT_SECRET must be set/);
  });

  it('rejects a non-postgres DATABASE_URL', () => {
    expect(() => validateEnv({ ...devEnv, DATABASE_URL: 'mysql://localhost/db' })).toThrow(
      /postgres/,
    );
  });

  it('rejects an out-of-range port', () => {
    expect(() => validateEnv({ ...devEnv, API_PORT: '70000' })).toThrow();
  });

  describe('production', () => {
    it('accepts a strong, fully configured environment', () => {
      expect(() => validateEnv(productionEnv)).not.toThrow();
    });

    it.each([
      ['a short secret', 'short-secret'],
      ['the documented dev default', 'change-me-in-development-only-please-change'],
      ['a repeated character', 'a'.repeat(48)],
      ['an e2e secret', 'e2e-local-secret-not-for-production-use'],
    ])('rejects %s as JWT_SECRET', (_label, secret) => {
      expect(() => validateEnv({ ...productionEnv, JWT_SECRET: secret })).toThrow(/JWT_SECRET/);
    });

    it('requires explicit CORS origins', () => {
      expect(() => validateEnv({ ...productionEnv, CORS_ORIGINS: '' })).toThrow(/CORS_ORIGINS/);
    });

    it('rejects wildcard or path-bearing CORS origins', () => {
      expect(() => validateEnv({ ...productionEnv, CORS_ORIGINS: '*' })).toThrow(/CORS_ORIGINS/);
      expect(() =>
        validateEnv({ ...productionEnv, CORS_ORIGINS: 'https://app.devtrack.example/app' }),
      ).toThrow(/CORS_ORIGINS/);
    });

    it('requires an absolute WEB_APP_URL', () => {
      expect(() => validateEnv({ ...productionEnv, WEB_APP_URL: 'app.devtrack.example' })).toThrow(
        /WEB_APP_URL/,
      );
    });
  });

  describe('mail', () => {
    it('requires credentials for the resend transport', () => {
      expect(() => validateEnv({ ...devEnv, MAIL_TRANSPORT: 'resend' })).toThrow(
        /RESEND_API_KEY[\s\S]*MAIL_FROM/,
      );
    });

    it('accepts a complete resend configuration', () => {
      expect(() =>
        validateEnv({
          ...devEnv,
          MAIL_TRANSPORT: 'resend',
          RESEND_API_KEY: 're_123',
          MAIL_FROM: 'DevTrack <no-reply@devtrack.example>',
        }),
      ).not.toThrow();
    });
  });
});
