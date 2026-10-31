import { adventurerExam } from '@cartagraph/domain/scenario/adventurer-exam';
import { expect, test } from '@playwright/test';

// PL-1 シーンで手札を出す：ホームから試験のシーンに入り、名乗るを出して名前を書き、次のシーンで名前を呼ばれる
const reception = adventurerExam.scenes.find((scene) => scene.id === adventurerExam.start)!;
const introduce = reception.hand.find((card) => card.asksCharacterName)!;
const examBegins = adventurerExam.scenes.find((scene) => scene.id === introduce.next)!;
const NAME = 'アリサ';

test('試験の受付で名乗り、次のシーンで名前を呼ばれる', { tag: ['@PL-1'] }, async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  await page.goto('/');
  await page.getByRole('link', { name: '試験を受ける' }).click();
  await expect(page.getByRole('heading', { level: 1, name: reception.title })).toBeVisible();

  await test.step('PL-1 名乗るを出す', async () => {
    await page.getByRole('button', { name: introduce.title }).click();
    const input = page.getByLabel('キャラクターの名前');
    await expect(input).toBeVisible();
    await input.fill(NAME);
    await page.getByRole('button', { name: 'この名前で名乗る' }).click();

    await expect(page.getByRole('heading', { level: 1, name: examBegins.title })).toBeVisible();
    await expect(
      page.getByText(examBegins.text[0]!.split('{characterName}').join(NAME)),
    ).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(consoleErrors, consoleErrors.join('\n')).toHaveLength(0);
  });
});
