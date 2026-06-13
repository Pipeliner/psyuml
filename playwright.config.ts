import { defineConfig } from '@playwright/test';

/**
 * Playwright E2E config for the PsyUML web editor (apps/web).
 *
 * Runs against the Vite dev server on a fixed port. Browsers are NOT installed by
 * `pnpm install` — run `npx playwright install chromium` first. This is intentionally
 * NOT part of `pnpm run verify` (which must stay browser-free for CI); run `pnpm run e2e`.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: 'list',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    // Containers need these; harmless locally.
    launchOptions: { args: ['--no-sandbox', '--disable-dev-shm-usage'] },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'pnpm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
