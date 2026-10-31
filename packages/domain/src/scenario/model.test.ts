// シナリオのスキーマの参照の検査（docs/plans/2026-10-31-P4-試験の最初のシーン.md D4・テスト2）
import { describe, expect, it } from 'vitest';
import { adventurerExam } from './adventurer-exam';
import { type Scenario, scenarioSchema } from './model';

// 実データを複製して1か所だけ書き換える
const edit = (change: (raw: Scenario) => void) => {
  const raw = structuredClone(adventurerExam);
  change(raw);
  return scenarioSchema.safeParse(raw);
};

const issuePaths = (result: ReturnType<typeof scenarioSchema.safeParse>) =>
  result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));

describe('scenarioSchema の参照の検査', () => {
  it('書き換えない実データは通る', () => {
    expect(scenarioSchema.safeParse(structuredClone(adventurerExam)).success).toBe(true);
  });

  it('start が無いシーンを指すと、start を指して断る', () => {
    const result = edit((raw) => {
      raw.start = 'nowhere';
    });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual(['start']);
  });

  it('カードの next が無いシーンを指すと、その next を指して断る', () => {
    const result = edit((raw) => {
      raw.scenes[0]!.hand[0]!.next = 'nowhere';
    });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual(['scenes.0.hand.0.next']);
  });

  it('シーンの id が重複すると、後のシーンの id を指して断る', () => {
    const result = edit((raw) => {
      raw.scenes.push(structuredClone(raw.scenes[0]!));
    });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual([`scenes.${adventurerExam.scenes.length}.id`]);
  });

  it('同じ手札のカードの id が重複すると、後のカードの id を指して断る', () => {
    const result = edit((raw) => {
      raw.scenes[0]!.hand.push({ ...raw.scenes[0]!.hand[0]! });
    });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual(['scenes.0.hand.1.id']);
  });
});
