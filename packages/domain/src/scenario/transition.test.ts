// シーンの進み方と名前の決まり（docs/plans/2026-10-31-P4-試験の最初のシーン.md D2・D4・テスト3〜7・9）
import { describe, expect, it } from 'vitest';
import { adventurerExam } from './adventurer-exam';
import type { PlayState, Scenario } from './model';
import { testScenario } from './test-scenario';
import { playCard, startPlay } from './transition';

const introduce = adventurerExam.scenes[0]!.hand[0]!;

// 断る場合に、入力を書き換えないことを確かめるため
const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
};

const frozen = (scenario: Scenario, state: PlayState = startPlay(scenario)) => ({
  scenario: deepFreeze(structuredClone(scenario)),
  state: deepFreeze({ ...state }),
});

describe('startPlay', () => {
  it('start のシーンで始まり、名前はまだ無い', () => {
    expect(startPlay(adventurerExam)).toEqual({
      sceneId: adventurerExam.start,
      characterName: null,
    });
  });
});

describe('playCard で手札を出す', { tags: ['rule:index/シーンですること'] }, () => {
  it('名乗るに名前を付けて出すと、次のシーンへ進み、名前が入る', () => {
    const { scenario, state } = frozen(adventurerExam);
    expect(playCard(scenario, state, introduce.id, 'アリサ')).toEqual({
      ok: true,
      state: { sceneId: introduce.next, characterName: 'アリサ' },
    });
  });

  it('名前の要らないカードに名前を渡しても、名前は変わらない', () => {
    const named = { sceneId: 'first', characterName: '元の名前' };
    expect(playCard(testScenario, named, 'walk', '新しい名前')).toEqual({
      ok: true,
      state: { sceneId: 'second', characterName: '元の名前' },
    });
  });

  it('今のシーンの手札に無いカード（別のシーンのカード・無い id）は unknownCard で断り、入力を書き換えない', () => {
    const { scenario, state } = frozen(testScenario);
    expect(playCard(scenario, state, 'back')).toEqual({ ok: false, reason: 'unknownCard' });
    expect(playCard(scenario, state, 'nothing', 'アリサ')).toEqual({
      ok: false,
      reason: 'unknownCard',
    });
  });

  it('無いカードに空の名前を渡しても unknownCard（カードを先に確かめる）', () => {
    const { scenario, state } = frozen(adventurerExam);
    expect(playCard(scenario, state, 'nothing', '')).toEqual({ ok: false, reason: 'unknownCard' });
  });

  it('手札が空のシーンでは、どのカードも unknownCard', () => {
    const last = { sceneId: introduce.next, characterName: 'アリサ' };
    expect(adventurerExam.scenes.find((scene) => scene.id === last.sceneId)!.hand).toEqual([]);
    expect(playCard(adventurerExam, last, introduce.id, 'アリサ')).toEqual({
      ok: false,
      reason: 'unknownCard',
    });
  });
});

describe('名前の決まり', { tags: ['rule:index/キャラクター'] }, () => {
  const play = (name: string | undefined) => {
    const { scenario, state } = frozen(adventurerExam);
    return playCard(scenario, state, introduce.id, name);
  };
  const nameOf = (name: string) => {
    const result = play(name);
    return result.ok ? result.state.characterName : result.reason;
  };

  it.each([
    ['名前が無い', undefined],
    ['空文字', ''],
    ['半角の空白だけ', '   '],
    ['全角の空白だけ', '　　'],
    ['タブと改行だけ', '\t\n'],
  ])('%s は nameRequired で断る', (_, name) => {
    expect(play(name)).toEqual({ ok: false, reason: 'nameRequired' });
  });

  const repeat = (unit: string, count: number) => unit.repeat(count);
  it.each([
    ['1文字', 'ア', 'ア'],
    ['10文字', repeat('ア', 10), repeat('ア', 10)],
    ['11文字', repeat('ア', 11), 'nameTooLong'],
    ['10文字 + 前後の空白', `　\t${repeat('ア', 10)} `, repeat('ア', 10)],
    ['11文字 + 前後の空白', ` ${repeat('ア', 11)}　`, 'nameTooLong'],
    ['途中の空白は残す', ' 山田 太郎 ', '山田 太郎'],
    ['サロゲートペアの絵文字 10 個', repeat('😀', 10), repeat('😀', 10)],
    ['サロゲートペアの絵文字 11 個', repeat('😀', 11), 'nameTooLong'],
    ['結合文字 10 個', repeat('é', 10), repeat('é', 10)],
    ['結合文字 11 個', repeat('é', 11), 'nameTooLong'],
    ['ZWJ の絵文字 10 個', repeat('👨‍👩‍👧', 10), repeat('👨‍👩‍👧', 10)],
    ['ZWJ の絵文字 11 個', repeat('👨‍👩‍👧', 11), 'nameTooLong'],
    ['国旗 10 個', repeat('🇯🇵', 10), repeat('🇯🇵', 10)],
    ['国旗 11 個', repeat('🇯🇵', 11), 'nameTooLong'],
  ])('%s', (_, name, expected) => {
    expect(nameOf(name)).toBe(expected);
  });
});
