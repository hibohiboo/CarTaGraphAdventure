import { adventurerExam } from '@cartagraph/domain/scenario/adventurer-exam';
import { expect, test } from '@playwright/test';

// PL-1 シーンで手札を出す：ホームから試験に入り、受付へ進み、台詞を読み切って名乗るを出し、名前を書いて、次の台詞で名前を呼ばれる
const beats = adventurerExam.scenes.flatMap((scene) => scene.beats);
const entrance = beats.find((beat) => beat.id === 'entrance');
const reception = beats.find((beat) => beat.id === 'reception');
const examBegins = beats.find((beat) => beat.id === 'exam-begins');
if (entrance?.layout !== 'paper') throw new Error('entrance は紙面のビート');
if (reception?.layout !== 'conversation') throw new Error('reception は会話のビート');
if (examBegins?.layout !== 'conversation') throw new Error('exam-begins は会話のビート');
const approach = entrance.hand[0]!;
const introduce = reception.hand.find((card) => card.asksCharacterName)!;
const milda = adventurerExam.npcs[0]!;
const NAME = 'アリサ';
const NEXT = '次へ';

test('試験の受付で名乗り、次の台詞で名前を呼ばれる', { tag: ['@PL-1'] }, async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  await page.goto('/');
  await page.getByRole('link', { name: '試験を受ける' }).click();
  await expect(page.getByText(entrance.text[0]!)).toBeVisible();
  await page.getByRole('button', { name: approach.title }).click();
  const log = page.getByRole('log');
  await expect(log.getByText(reception.lines[0]!.text)).toBeVisible();
  await expect(page.getByRole('region', { name: '話している相手' })).toContainText(milda.name);

  await test.step('PL-1 名乗るを出す', async () => {
    const introduceButton = page.getByRole('button', { name: introduce.title });
    await expect(log.locator('p')).toHaveCount(1);
    await expect(introduceButton).toHaveCount(0);
    await page.getByRole('button', { name: NEXT }).click();
    await expect(log.locator('p')).toHaveCount(2);
    for (let i = 2; i < reception.lines.length; i++)
      await page.getByRole('button', { name: NEXT }).click();
    await expect(page.getByRole('button', { name: NEXT })).toHaveCount(0);
    await introduceButton.click();
    const input = page.getByLabel('キャラクターの名前');
    await expect(input).toBeVisible();
    await input.fill(NAME);
    await page.getByRole('button', { name: 'この名前で名乗る' }).click();

    await expect(
      log.getByText(examBegins.lines[0]!.text.split('{characterName}').join(NAME)),
    ).toBeVisible();
    await expect(log.getByText(introduce.say!.split('{characterName}').join(NAME))).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(consoleErrors, consoleErrors.join('\n')).toHaveLength(0);
  });
});
