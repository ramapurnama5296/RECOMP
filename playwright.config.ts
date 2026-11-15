import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  use: {
    ...devices['iPhone 13'],
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    baseURL: 'http://127.0.0.1:4174/recomp/',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node tests/browser/serve.mjs',
    url: 'http://127.0.0.1:4174/recomp/',
    reuseExistingServer: false,
  },
})
