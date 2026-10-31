// 冒険者登録の試験のシナリオの実データ（docs/plans/2026-10-31-P4-試験の最初のシーン.md D7・テスト1）
import { describe, expect, it } from 'vitest';
import { adventurerExam } from './adventurer-exam';
import adventurerExamRaw from './adventurer-exam.json';
import { scenarioSchema } from './model';

const sceneById = new Map(adventurerExam.scenes.map((scene) => [scene.id, scene]));

// start から手札の next をたどって辿り着けるシーンの id
const reachable = () => {
  const seen = new Set<string>();
  const queue = [adventurerExam.start];
  for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
    if (seen.has(id)) continue;
    seen.add(id);
    queue.push(...(sceneById.get(id)?.hand.map((card) => card.next) ?? []));
  }
  return seen;
};

describe('adventurer-exam', () => {
  it('JSON が scenarioSchema を通る', () => {
    expect(scenarioSchema.safeParse(adventurerExamRaw).success).toBe(true);
  });

  it('start のシーンがあり、start から全シーンに辿り着ける', () => {
    expect(sceneById.has(adventurerExam.start)).toBe(true);
    expect([...reachable()].sort()).toEqual([...sceneById.keys()].sort());
  });

  it('名前が決まる前のシーン（start）の文に {characterName} が無く、名乗った後のシーンの文にはある', () => {
    const start = sceneById.get(adventurerExam.start)!;
    expect(start.text.join('\n')).not.toContain('{characterName}');
    const named = start.hand.find((card) => card.asksCharacterName)!;
    expect(sceneById.get(named.next)!.text.join('\n')).toContain('{characterName}');
  });
});
