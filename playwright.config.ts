import { defineConfig, devices } from '@playwright/test'
import { pagesBase } from './scripts/pages-base.ts'

const baseURL = 'http://127.0.0.1:4174' + pagesBase()

export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  use: {
    ...devices['iPhone 13'],
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node tests/browser/serve.mjs',
    url: baseURL,
    reuseExistingServer: false,
  },
})
