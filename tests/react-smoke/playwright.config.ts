import { defineConfig, devices } from '@playwright/test'

const port = 4179

export default defineConfig({
  testDir: '.',
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: { baseURL: `http://127.0.0.1:${port}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `vite tests/react-smoke --host 127.0.0.1 --port ${port} --strictPort`,
    cwd: '../..',
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
  },
})
