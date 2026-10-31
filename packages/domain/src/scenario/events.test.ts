// イベントの列と流し直し（docs/plans/2026-10-31-P6-提案の保存.md D1・テスト1〜5・9・10）
import { describe, expect, it } from 'vitest';
import { adventurerExam } from './adventurer-exam';
import { decidePlayCard, replay } from './events';
import { type PlayEvent, playEventSchema } from './model';
import { testScenario } from './test-scenario';
import { playCard, startPlay } from './transition';

const played = (beatId: string, cardId: string, characterName?: string): PlayEvent =>
  characterName === undefined
    ? { type: 'cardPlayed', beatId, cardId }
    : { type: 'cardPlayed', beatId, cardId, characterName };

describe('replay', () => {
  it('空の列は startPlay と同じ状態', () => {
    expect(replay(adventurerExam, [])).toEqual({ ok: true, state: startPlay(adventurerExam) });
  });

  it('実データの「受付へ進む → 名乗る」の列は、同じ順に playCard を当てた結果と同じ状態', () => {
    const first = playCard(adventurerExam, startPlay(adventurerExam), 'approach');
    if (!first.ok) throw new Error('approach が断られた');
    const second = playCard(adventurerExam, first.state, 'introduce', 'アリサ');
    if (!second.ok) throw new Error('introduce が断られた');

    const result = replay(adventurerExam, [
      played('entrance', 'approach'),
      played('reception', 'introduce', 'アリサ'),
    ]);

    expect(result).toEqual({ ok: true, state: second.state });
    expect(second.state.beatId).toBe('exam-begins');
    expect(second.state.characterName).toBe('アリサ');
    expect(second.state.log.length).toBeGreaterThan(0);
  });

  it('proposed は状態を変えない。前の proposed を含む列も流せる', () => {
    const base = [played('entrance', 'approach')];
    const before = replay(adventurerExam, base);
    const once = replay(adventurerExam, [
      ...base,
      { type: 'proposed', beatId: 'reception', text: '一つ目' },
    ]);
    const twice = replay(adventurerExam, [
      ...base,
      { type: 'proposed', beatId: 'reception', text: '一つ目' },
      { type: 'proposed', beatId: 'reception', text: '二つ目' },
    ]);
    expect(once).toEqual(before);
    expect(twice).toEqual(before);
  });

  it('今のビートと違う beatId のイベントは、その位置で断る', () => {
    expect(
      replay(adventurerExam, [played('entrance', 'approach'), played('entrance', 'approach')]),
    ).toEqual({
      ok: false,
      index: 1,
      reason: 'beatMismatch',
    });
    expect(replay(adventurerExam, [{ type: 'proposed', beatId: 'reception', text: 'x' }])).toEqual({
      ok: false,
      index: 0,
      reason: 'beatMismatch',
    });
  });

  it('playCard が断るイベント（無いカード・名前が空）は、その位置と理由で断る', () => {
    expect(replay(adventurerExam, [played('entrance', 'nope')])).toEqual({
      ok: false,
      index: 0,
      reason: 'unknownCard',
    });
    expect(
      replay(adventurerExam, [
        played('entrance', 'approach'),
        played('reception', 'introduce', ' '),
      ]),
    ).toEqual({ ok: false, index: 1, reason: 'nameRequired' });
  });
});

describe('decidePlayCard', { tags: ['rule:index/提案'] }, () => {
  it('提案待ちのビートでは awaitingProposal で断る', () => {
    expect(
      decidePlayCard(testScenario, [], { cardId: 'walk', awaitingBeatIds: new Set(['a1']) }),
    ).toEqual({ ok: false, reason: 'awaitingProposal' });
  });

  it('提案待ちの集合に無ければ playCard と同じ状態になり、cardPlayed を足した列を返す', () => {
    const result = decidePlayCard(testScenario, [], {
      cardId: 'name',
      characterName: ' アリサ ',
      awaitingBeatIds: new Set(['zzz']),
    });
    const direct = playCard(testScenario, startPlay(testScenario), 'name', 'アリサ');
    if (!(result.ok && direct.ok)) throw new Error('断られた');
    const expected = played('a1', 'name', 'アリサ');
    expect(result.event).toEqual(expected);
    expect(result.events).toEqual([expected]);
    expect(replay(testScenario, result.events)).toEqual({ ok: true, state: direct.state });
  });

  it('名前を書かないカードのイベントには characterName が入らない', () => {
    const result = decidePlayCard(testScenario, [], {
      cardId: 'walk',
      characterName: '無視される',
    });
    if (!result.ok) throw new Error('断られた');
    expect(result.event).toEqual({ type: 'cardPlayed', beatId: 'a1', cardId: 'walk' });
  });

  it('playCard が断る理由をそのまま返す', () => {
    expect(decidePlayCard(testScenario, [], { cardId: 'name' })).toEqual({
      ok: false,
      reason: 'nameRequired',
    });
    expect(decidePlayCard(testScenario, [], { cardId: 'nope' })).toEqual({
      ok: false,
      reason: 'unknownCard',
    });
  });

  it('replay が断る列なら invalidEvents', () => {
    expect(decidePlayCard(testScenario, [played('zzz', 'walk')], { cardId: 'walk' })).toEqual({
      ok: false,
      reason: 'invalidEvents',
    });
  });

  it('渡した列を書き換えない', () => {
    const events: PlayEvent[] = [];
    decidePlayCard(testScenario, events, { cardId: 'walk' });
    expect(events).toEqual([]);
  });
});

describe('playEventSchema', () => {
  it('正しい形を通す', () => {
    expect(playEventSchema.safeParse(played('a', 'b')).success).toBe(true);
    expect(playEventSchema.safeParse(played('a', 'b', 'アリサ')).success).toBe(true);
    expect(playEventSchema.safeParse({ type: 'proposed', beatId: 'a', text: 't' }).success).toBe(
      true,
    );
  });

  it('type が無い・未知の type・余分なキーを断る', () => {
    expect(playEventSchema.safeParse({ beatId: 'a', cardId: 'b' }).success).toBe(false);
    expect(playEventSchema.safeParse({ type: 'other', beatId: 'a' }).success).toBe(false);
    expect(
      playEventSchema.safeParse({ type: 'cardPlayed', beatId: 'a', cardId: 'b', extra: 1 }).success,
    ).toBe(false);
    expect(
      playEventSchema.safeParse({ type: 'proposed', beatId: 'a', text: 't', extra: 1 }).success,
    ).toBe(false);
  });
});
