import { expect, test } from '@playwright/test';
import { routes } from '../src/shared/routes/routes';

/**
 * routes.ts（パスの一覧の唯一の情報源）を巡回し、全ルートが実ブラウザで
 * 例外なく描画できることを確認するスモークテスト。動的ルートは route.example を使う。
 */
for (const route of routes) {
  const target = route.path.includes(':') ? (route.example ?? route.path) : route.path;

  test(`${route.title}（${target}）が描画できる`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    await page.goto(`/#${target}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(consoleErrors, consoleErrors.join('\n')).toHaveLength(0);
    expect(pageErrors, pageErrors.join('\n')).toHaveLength(0);
  });
}

// 公開版（build ＋ preview）には提案の口が無いので、提案のカードを出さない。PL-2 の主な流れではないので、
// ユースケースのタグは付けない（docs/plans/2026-10-31-P6-提案の保存.md テスト41）
test('試験のシーンに、GM への提案のカードが出ない（公開版）', async ({ page }) => {
  await page.goto('/#/exam');
  await expect(page.getByRole('button', { name: /受付へ進む/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'GM への提案' })).toHaveCount(0);
});
