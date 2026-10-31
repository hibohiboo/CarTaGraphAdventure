// 会話の履歴の範囲（docs/plans/2026-10-31-P5-会話の画面.md D5・テスト8）
import { describe, expect, it } from 'vitest';
import { conversationHistory } from './conversation';
import type { PlayState } from './model';
import { testScenario } from './test-scenario';
import { playCard, startPlay } from './transition';

const play = (state: PlayState, cardId: string, name?: string): PlayState => {
  const result = playCard(testScenario, state, cardId, name);
  if (!result.ok) throw new Error(result.reason);
  return result.state;
};

const texts = (state: PlayState) =>
  conversationHistory(testScenario, state).map((entry) => entry.text);

const entry = (beatId: string, speaker: string | null, text: string) => ({ beatId, speaker, text });

describe('conversationHistory', { tags: ['rule:index/ビートの見せ方'] }, () => {
  it('ログが空なら空', () => {
    expect(conversationHistory(testScenario, startPlay(testScenario))).toEqual([]);
  });

  it('紙面（a1）→ a2 → a3 と進んだ a3 では、a2 の台詞と say だけを返し、a1 の段落は返さない', () => {
    const a3 = play(play(startPlay(testScenario), 'walk'), 'reply');
    expect(a3.beatId).toBe('a3');
    expect(texts(a3)).toEqual([
      'a2 の台詞 1',
      'a2 の台詞 2',
      'a2 の台詞 3 {characterName}',
      'a2 の返事 {characterName}',
    ]);
  });

  it('b1 → b2（紙面）→ b3 と進んだ b3 では、b1 の台詞1行だけを返す（紙面の行・別のシーンの行は返さない）', () => {
    let state: PlayState = { beatId: 'a3', characterName: null, log: [] };
    state = play(play(state, 'leave'), 'toPaper');
    state = play(state, 'toTalk');
    expect(state.beatId).toBe('b3');
    expect(texts(state)).toEqual(['b1 の台詞']);
  });

  it('別のシーンを挟むログは、最後の同じシーンの行だけを返す', () => {
    const state: PlayState = {
      beatId: 'a3',
      characterName: null,
      log: [entry('a2', 'A', '古いA'), entry('b1', 'A', 'B'), entry('a3', 'B', '新しいA')],
    };
    expect(texts(state)).toEqual(['新しいA']);
  });

  it('いまのビートが紙面でも、同じシーンの会話の行を返す', () => {
    const state: PlayState = {
      beatId: 'a1',
      characterName: null,
      log: [entry('a2', 'A', '台詞'), entry('a1', null, '段落')],
    };
    expect(texts(state)).toEqual(['台詞']);
  });

  it('ログの行のビートがシナリオに無ければ例外', () => {
    const state: PlayState = {
      beatId: 'a1',
      characterName: null,
      log: [entry('nowhere', 'A', 'x')],
    };
    expect(() => conversationHistory(testScenario, state)).toThrow();
  });
});
