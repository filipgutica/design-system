import { defineConfig, devices } from '@playwright/test'

const port = 4181

// The built site/, served under /design-system/ as GitHub Pages serves it. Run `pnpm site:build` first.
export default defineConfig({
  testDir: '.',
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: { baseURL: `http://127.0.0.1:${port}/design-system/` },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // WebKit runs only the tests tagged @webkit, which check behaviour that differs in Safari.
    { name: 'webkit', grep: /@webkit/, use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `node tests/site/serve.mjs ${port}`,
    cwd: '../..',
    url: `http://127.0.0.1:${port}/design-system/`,
    reuseExistingServer: !process.env.CI,
  },
})
