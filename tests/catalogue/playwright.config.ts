import { defineConfig, devices } from '@playwright/test'

// The catalogue is a static file with no build step, so the tests open it from disk.
export default defineConfig({
  testDir: '.',
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // WebKit runs only the tests tagged @webkit, which check behaviour that differs in Safari.
    { name: 'webkit', grep: /@webkit/, use: { ...devices['Desktop Safari'] } },
  ],
})
