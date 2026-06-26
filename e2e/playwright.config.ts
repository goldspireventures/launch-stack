import { defineConfig, devices } from '@playwright/test';

const marketing = process.env.E2E_MARKETING_URL ?? 'http://localhost:4010';
const heartline = process.env.E2E_HEARTLINE_URL ?? 'http://localhost:4000';
const portal = process.env.E2E_PORTAL_URL ?? 'http://localhost:4005';
const consoleUrl = process.env.E2E_CONSOLE_URL ?? 'http://localhost:4001';
const atlasUrl = process.env.E2E_ATLAS_URL ?? 'http://localhost:4016';
const mobileWebUrl = process.env.E2E_MOBILE_WEB_URL ?? 'http://localhost:8081';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'marketing',
      testMatch: /marketing\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: marketing },
      fullyParallel: false,
    },
    { name: 'demos', testMatch: /golden-paths\.spec\.ts/ },
    { name: 'heartline', testMatch: /heartline\.spec\.ts/, use: { ...devices['Desktop Chrome'], baseURL: heartline } },
    {
      name: 'dating-mobile-web',
      testMatch: /dating-mobile-web\.spec\.ts/,
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium',
        baseURL: mobileWebUrl,
      },
      timeout: 90_000,
    },
    {
      name: 'heartline-showcase',
      testMatch: /heartline-showcase\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: heartline },
      timeout: 120_000,
      fullyParallel: false,
    },
    {
      name: 'heartline-mobile-showcase',
      testMatch: /dating-mobile-showcase\.spec\.ts/,
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium',
        baseURL: mobileWebUrl,
      },
      timeout: 120_000,
      fullyParallel: false,
    },
    { name: 'portal', testMatch: /portal\.spec\.ts/, use: { ...devices['Desktop Chrome'], baseURL: portal } },
    {
      name: 'console',
      testMatch: /console-studio\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: consoleUrl,
        extraHTTPHeaders: { 'x-e2e-persona': 'studio.owner' },
      },
      dependencies: ['platform-full', 'marketing'],
    },
    {
      name: 'studio-lab',
      testMatch: /studio-lab\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: consoleUrl,
        extraHTTPHeaders: { 'x-e2e-persona': 'studio.owner' },
      },
    },
    {
      name: 'build-plan',
      testMatch: /(build-plan-visual|nova-care-golden)\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: marketing,
        extraHTTPHeaders: { 'x-e2e-persona': 'studio.owner' },
      },
      timeout: 120_000,
      fullyParallel: false,
    },
    {
      name: 'studio-os',
      testMatch: /(studio-os|studio-lab|platform-console)\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: consoleUrl,
        extraHTTPHeaders: { 'x-e2e-persona': 'studio.owner' },
      },
      dependencies: ['platform-full', 'marketing'],
    },
    {
      name: 'integration',
      testMatch: /contact-to-lead\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: marketing },
      timeout: 90_000,
      /** Avoid racing marketing contact + integration submit against the same rate-limit bucket. */
      dependencies: ['marketing'],
    },
    {
      name: 'atlas',
      testMatch: /atlas\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: atlasUrl,
        extraHTTPHeaders: { 'x-e2e-persona': 'studio.owner' },
      },
      dependencies: ['platform-full'],
    },
    {
      name: 'platform-v2',
      testMatch: /platform-v2\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: consoleUrl,
        extraHTTPHeaders: { 'x-e2e-persona': 'studio.owner' },
      },
      dependencies: ['studio-os'],
    },
    {
      name: 'platform-full',
      testMatch: /platform-full\.spec\.ts/,
    },
    {
      name: 'golden-platform',
      testMatch: /golden-platform\.spec\.ts/,
      timeout: 180_000,
      fullyParallel: false,
      use: { ...devices['Desktop Chrome'], baseURL: marketing },
      dependencies: ['platform-full'],
    },
    {
      name: 'platform-demo',
      testMatch: /platform-demo\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: marketing },
      timeout: 120_000,
      dependencies: ['platform-full', 'marketing', 'studio-os'],
    },
  ],
  webServer: process.env.CI
    ? undefined
    : [
        {
          command: 'pnpm --filter @goldspire/goldspire-web dev',
          url: marketing,
          reuseExistingServer: true,
          timeout: 120_000,
        },
        {
          command: 'pnpm --filter @goldspire/console dev',
          url: consoleUrl,
          reuseExistingServer: true,
          timeout: 120_000,
        },
        {
          command: 'pnpm --filter @goldspire/dating-web dev',
          url: `${heartline.replace(/\/$/, '')}/api/health`,
          reuseExistingServer: true,
          timeout: 180_000,
        },
        {
          command: 'pnpm --filter @goldspire/client-portal dev',
          url: `${portal.replace(/\/$/, '')}/api/health`,
          reuseExistingServer: true,
          timeout: 120_000,
        },
        {
          command: 'pnpm --filter @goldspire/atlas dev',
          url: `${atlasUrl.replace(/\/$/, '')}/api/health`,
          reuseExistingServer: true,
          timeout: 120_000,
        },
      ],
});
