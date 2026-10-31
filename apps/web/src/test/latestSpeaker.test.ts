// 直近に話した人（docs/plans/2026-10-31-P5-会話の画面.md D3・テスト11）
import { describe, expect, it } from 'vitest';
import { latestSpeaker } from '@/pages/pl/exam/lib/latestSpeaker';

const lines = [
  { speaker: 'A', text: '1' },
  { speaker: 'B', text: '2' },
  { speaker: 'A', text: '3' },
];

describe('latestSpeaker', () => {
  it.each([
    [1, 'A'],
    [2, 'B'],
    [3, 'A'],
  ])('%i 個読んだとき、直近の話し手は %s', (revealed, expected) => {
    expect(latestSpeaker(lines, revealed)).toBe(expected);
  });

  it.each([0, 4])('読んだ数が %i（範囲の外）なら例外', (revealed) => {
    expect(() => latestSpeaker(lines, revealed)).toThrow();
  });
});
