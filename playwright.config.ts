import { defineConfig, devices } from '@playwright/test';

// In CI the apps are built first and tests run against the production artifacts, so the browser
// exercises the same server, headers and CSP that ship. Locally, dev servers are faster to iterate.
const useBuiltArtifacts = !!process.env.CI;

const apiCommand = useBuiltArtifacts
  ? 'pnpm --filter @devtrack/api start:prod'
  : 'pnpm --filter @devtrack/shared build && pnpm --filter @devtrack/api start:dev';

const webCommand = useBuiltArtifacts
  ? 'pnpm --filter @devtrack/web start'
  : 'pnpm --filter @devtrack/web dev';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: apiCommand,
      url: 'http://localhost:3001/health/ready',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        DATABASE_URL:
          process.env.DATABASE_URL ??
          'postgresql://devtrack:devtrack@localhost:55432/devtrack?schema=public',
        // Test-only value; the API refuses weak secrets when NODE_ENV=production.
        JWT_SECRET: process.env.JWT_SECRET ?? 'e2e-local-secret-not-for-production',
        API_PORT: process.env.API_PORT ?? '3001',
        CORS_ORIGINS: process.env.CORS_ORIGINS ?? 'http://localhost:3000',
      },
    },
    {
      command: webCommand,
      url: 'http://localhost:3000/login',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
      },
    },
  ],
});
