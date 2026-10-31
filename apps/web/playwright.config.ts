import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.test.ts',
  fullyParallel: true,
  // test.only を残すと、ほかのテスト（ユースケースの通し）が黙って走らなくなる
  forbidOnly: !!process.env.CI,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    // ユースケースのページ（scripts/build-usecase-report.mjs）の入力
    ['json', { outputFile: 'e2e-results/results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:4173',
    screenshot: { mode: 'on', fullPage: true },
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm build && pnpm preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    // E2E のビルドは空の提案待ちの一覧を読む（コミットした未完了の提案や、手元の未追跡のファイルで止まらないように）
    env: { PROPOSALS_BACKLOG: 'none' },
  },
});
