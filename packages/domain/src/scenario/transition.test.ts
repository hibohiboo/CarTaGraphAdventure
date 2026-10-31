// ビートの進み方・プレイログ・名前の決まり（docs/plans/2026-10-31-P5-会話の画面.md D1・D5・テスト4〜10）
import { describe, expect, it } from 'vitest';
import { adventurerExam } from './adventurer-exam';
import type { PlayState, Scenario } from './model';
import { testScenario } from './test-scenario';
import { locateBeat, playCard, startPlay } from './transition';

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
  state: deepFreeze(structuredClone(state)),
});

const at = (beatId: string, characterName: string | null = null, log: PlayState['log'] = []) => ({
  beatId,
  characterName,
  log,
});

const old = { beatId: 'old', speaker: null, text: '前の行' };

describe('startPlay', () => {
  it('start のビートで始まり、名前はまだ無く、ログは空', () => {
    expect(startPlay(adventurerExam)).toEqual({
      beatId: adventurerExam.start,
      characterName: null,
      log: [],
    });
  });
});

describe('playCard で手札を出す', { tags: ['rule:index/シーンですること'] }, () => {
  it('紙面のビートのカードを出すと次のビートへ進み、段落がログに足される（say が無ければ自分の台詞は足されない）', () => {
    const { scenario, state } = frozen(testScenario, at('a1', null, [old]));
    expect(playCard(scenario, state, 'walk')).toEqual({
      ok: true,
      state: {
        beatId: 'a2',
        characterName: null,
        log: [
          old,
          { beatId: 'a1', speaker: null, text: 'a1 の段落 1' },
          { beatId: 'a1', speaker: null, text: 'a1 の段落 2' },
        ],
      },
    });
  });

  it('会話のビートのカードを出すと、台詞が speaker つきで、続けて say が player で足される。text は置き換えない生のまま', () => {
    const { scenario, state } = frozen(testScenario, at('a2', '元の名前'));
    const result = playCard(scenario, state, 'reply');
    expect(result).toEqual({
      ok: true,
      state: {
        beatId: 'a3',
        characterName: '元の名前',
        log: [
          { beatId: 'a2', speaker: 'A', text: 'a2 の台詞 1' },
          { beatId: 'a2', speaker: 'B', text: 'a2 の台詞 2' },
          { beatId: 'a2', speaker: 'A', text: 'a2 の台詞 3 {characterName}' },
          { beatId: 'a2', speaker: 'player', text: 'a2 の返事 {characterName}' },
        ],
      },
    });
    expect(result.ok && result.state.log !== state.log).toBe(true);
  });

  it('名前を書くカードに名前を付けて出すと、名前が入り、ログの say は置き換えない生のまま', () => {
    const { scenario, state } = frozen(adventurerExam, at('reception'));
    const result = playCard(scenario, state, 'introduce', 'アリサ');
    expect(result).toEqual({
      ok: true,
      state: {
        beatId: 'exam-begins',
        characterName: 'アリサ',
        log: [
          { beatId: 'reception', speaker: 'milda', text: expect.any(String) },
          { beatId: 'reception', speaker: 'milda', text: expect.any(String) },
          { beatId: 'reception', speaker: 'milda', text: expect.any(String) },
          { beatId: 'reception', speaker: 'player', text: '{characterName}' },
        ],
      },
    });
  });

  it('名前の要らないカードに名前を渡しても、名前は変わらない', () => {
    const { scenario, state } = frozen(testScenario, at('a1', '元の名前'));
    const result = playCard(scenario, state, 'walk', '新しい名前');
    expect(result.ok && result.state.characterName).toBe('元の名前');
  });

  it('別のシーンのビートを next に持つカードでも進める', () => {
    const { scenario, state } = frozen(testScenario, at('a3'));
    const result = playCard(scenario, state, 'leave');
    expect(result.ok && result.state.beatId).toBe('b1');
  });

  it('今のビートの手札に無いカード（別のビートのカード・無い id）は unknownCard で断り、入力を書き換えない', () => {
    const { scenario, state } = frozen(testScenario, at('a1', null, [old]));
    expect(playCard(scenario, state, 'reply')).toEqual({ ok: false, reason: 'unknownCard' });
    expect(playCard(scenario, state, 'nothing', 'アリサ')).toEqual({
      ok: false,
      reason: 'unknownCard',
    });
  });

  it('無いカードに空の名前を渡しても unknownCard（カードを先に確かめる）', () => {
    const { scenario, state } = frozen(adventurerExam, at('reception'));
    expect(playCard(scenario, state, 'nothing', '')).toEqual({ ok: false, reason: 'unknownCard' });
  });

  it('手札が空のビート（exam-begins）では、どのカードも unknownCard', () => {
    const state = at('exam-begins', 'アリサ');
    expect(playCard(adventurerExam, state, 'introduce', 'アリサ')).toEqual({
      ok: false,
      reason: 'unknownCard',
    });
  });
});

describe('名前の決まり', { tags: ['rule:index/キャラクター'] }, () => {
  // 既存のログがある状態から試す（ログを先に足してから断る実装を拾う）
  const play = (name: string | undefined) => {
    const { scenario, state } = frozen(adventurerExam, at('reception', null, [old]));
    const result = playCard(scenario, state, 'introduce', name);
    return { result, state };
  };
  const nameOf = (name: string) => {
    const { result } = play(name);
    return result.ok ? result.state.characterName : result.reason;
  };

  it.each([
    ['名前が無い', undefined],
    ['空文字', ''],
    ['半角の空白だけ', '   '],
    ['全角の空白だけ', '　　'],
    ['タブと改行だけ', '\t\n'],
  ])('%s は nameRequired で断り、ログは増えない', (_, name) => {
    const { result, state } = play(name);
    expect(result).toEqual({ ok: false, reason: 'nameRequired' });
    expect(state.log).toEqual([old]);
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
    ['結合文字 10 個', repeat('é', 10), repeat('é', 10)],
    ['結合文字 11 個', repeat('é', 11), 'nameTooLong'],
    ['ZWJ の絵文字 10 個', repeat('👨‍👩‍👧', 10), repeat('👨‍👩‍👧', 10)],
    ['ZWJ の絵文字 11 個', repeat('👨‍👩‍👧', 11), 'nameTooLong'],
    ['国旗 10 個', repeat('🇯🇵', 10), repeat('🇯🇵', 10)],
    ['国旗 11 個', repeat('🇯🇵', 11), 'nameTooLong'],
  ])('%s', (_, name, expected) => {
    expect(nameOf(name)).toBe(expected);
  });
});

describe('locateBeat', () => {
  it('ビートと、属するシーンを返す。無い id は undefined', () => {
    const found = locateBeat(testScenario, 'b2');
    expect(found?.scene.id).toBe('sb');
    expect(found?.beat.id).toBe('b2');
    expect(locateBeat(testScenario, 'sb')).toBeUndefined();
  });
});
