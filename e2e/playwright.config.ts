// End-to-end tests: full journeys through web/admin → api → Postgres, with Stripe in test
// mode (Stripe CLI forwards webhooks). Tests live in tests/<module>/ (sparse-checkout friendly).
import { defineConfig, devices } from '@playwright/test';

const CI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.WEB_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : [
        {
          command: 'pnpm --filter @pilates/api dev',
          url: 'http://localhost:3000/api/health',
          reuseExistingServer: !CI,
        },
        {
          command: 'pnpm --filter @pilates/web dev',
          url: 'http://localhost:5173',
          reuseExistingServer: !CI,
        },
        {
          command: 'pnpm --filter @pilates/admin dev',
          url: 'http://localhost:5174',
          reuseExistingServer: !CI,
        },
      ],
});
