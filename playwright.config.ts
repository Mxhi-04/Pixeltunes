import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 3,
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    ...(process.env.PIXELTUNES_CROSS_BROWSER ? [
      { name: 'firefox', testIgnore: '**/desktop.spec.ts', use: { browserName: 'firefox' as const } },
      { name: 'webkit', testIgnore: '**/desktop.spec.ts', use: { browserName: 'webkit' as const } },
    ] : []),
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: process.env.CI ? 'retain-on-failure' : 'off',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
