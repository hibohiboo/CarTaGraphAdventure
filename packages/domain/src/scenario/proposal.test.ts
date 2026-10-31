// 提案の決まり（docs/plans/2026-10-31-P6-提案の保存.md D2・テスト6〜8・11・12）
import { describe, expect, it } from 'vitest';
import { adventurerExam } from './adventurer-exam';
import type { PlayEvent } from './model';
import {
  awaitingProposal,
  normalizeProposalText,
  type PendingProposal,
  PROPOSAL_TEXT_MAX_LENGTH,
  proposalSummary,
  proposalTitle,
  propose,
} from './proposal';

const approach: PlayEvent = { type: 'cardPlayed', beatId: 'entrance', cardId: 'approach' };

describe('normalizeProposalText', { tags: ['rule:index/提案'] }, () => {
  it('前後の空白を除く。中の改行は残る', () => {
    expect(normalizeProposalText('  \n一行目\n二行目 \n')).toEqual({
      ok: true,
      text: '一行目\n二行目',
    });
  });

  it('空・空白だけ・改行だけは textRequired', () => {
    for (const raw of ['', '   ', '\n\n', ' \r\n\t']) {
      expect(normalizeProposalText(raw)).toEqual({ ok: false, reason: 'textRequired' });
    }
  });

  it('4000文字ちょうど（絵文字。.length では 8000）は通り、4001文字は textTooLong', () => {
    expect(PROPOSAL_TEXT_MAX_LENGTH).toBe(4000);
    const ok = '😀'.repeat(4000);
    expect(ok.length).toBe(8000);
    expect(normalizeProposalText(ok)).toEqual({ ok: true, text: ok });
    expect(normalizeProposalText('😀'.repeat(4001))).toEqual({ ok: false, reason: 'textTooLong' });
  });

  it('結合文字は1文字で数える', () => {
    const family = '👨‍👩‍👧‍👦';
    expect(normalizeProposalText(family.repeat(4000)).ok).toBe(true);
    expect(normalizeProposalText(family.repeat(4001)).ok).toBe(false);
    expect(normalizeProposalText(`${'が'.repeat(4000)}`).ok).toBe(true);
  });
});

describe('propose', { tags: ['rule:index/提案'] }, () => {
  it('replay の終わりのビートで、正規化した文の proposed を末尾に足す', () => {
    const result = propose(adventurerExam, [approach], '  試験官に質問したい \n');
    if (!result.ok) throw new Error('断られた');
    const event: PlayEvent = { type: 'proposed', beatId: 'reception', text: '試験官に質問したい' };
    expect(result.event).toEqual(event);
    expect(result.events).toEqual([approach, event]);
  });

  it('前の proposed があっても重ねて提案できる', () => {
    const first = propose(adventurerExam, [approach], 'ひとつめ');
    if (!first.ok) throw new Error('断られた');
    const second = propose(adventurerExam, first.events, 'ふたつめ');
    if (!second.ok) throw new Error('断られた');
    expect(second.events.map((e) => e.type)).toEqual(['cardPlayed', 'proposed', 'proposed']);
  });

  it('文の決まりに合わなければ断る', () => {
    expect(propose(adventurerExam, [], '  ')).toEqual({ ok: false, reason: 'textRequired' });
    expect(propose(adventurerExam, [], 'あ'.repeat(4001))).toEqual({
      ok: false,
      reason: 'textTooLong',
    });
  });

  it('replay が断る列なら invalidEvents', () => {
    const bad: PlayEvent = { type: 'cardPlayed', beatId: 'reception', cardId: 'introduce' };
    expect(propose(adventurerExam, [bad], 'x')).toEqual({ ok: false, reason: 'invalidEvents' });
  });

  it('渡した列を書き換えない', () => {
    const events = [approach];
    propose(adventurerExam, events, 'x');
    expect(events).toEqual([approach]);
  });
});

describe('awaitingProposal', { tags: ['rule:index/提案'] }, () => {
  const pending = (scenarioId: string, beatId: string, summary: string): PendingProposal => ({
    scenarioId,
    beatId,
    summary,
  });

  it('一覧にそのビートがあれば文を返す', () => {
    expect(
      awaitingProposal({
        proposals: [pending('s', 'b1', '要約A')],
        events: [],
        scenarioId: 's',
        beatId: 'b1',
      }),
    ).toEqual(['要約A']);
  });

  it('別のビートだけなら空', () => {
    expect(
      awaitingProposal({
        proposals: [pending('s', 'b2', '要約A')],
        events: [],
        scenarioId: 's',
        beatId: 'b1',
      }),
    ).toEqual([]);
  });

  it('別のシナリオの同じ beatId は数えない', () => {
    expect(
      awaitingProposal({
        proposals: [pending('other', 'b1', '要約A')],
        events: [],
        scenarioId: 's',
        beatId: 'b1',
      }),
    ).toEqual([]);
  });

  it('このセッションの proposed も、そのビートなら要約にして入る（別のビートは入らない）', () => {
    const events: PlayEvent[] = [
      { type: 'proposed', beatId: 'b1', text: '一行目\r\n二行目' },
      { type: 'proposed', beatId: 'b2', text: '別のビート' },
      { type: 'cardPlayed', beatId: 'b1', cardId: 'x' },
    ];
    expect(
      awaitingProposal({
        proposals: [pending('s', 'b1', '要約A')],
        events,
        scenarioId: 's',
        beatId: 'b1',
      }),
    ).toEqual(['要約A', '一行目 二行目']);
  });
});

describe('proposalTitle', () => {
  it('「提案：」＋1行目。30文字ちょうどは「…」なし、31文字は30文字＋「…」', () => {
    expect(proposalTitle('あ'.repeat(30))).toBe(`提案：${'あ'.repeat(30)}`);
    expect(proposalTitle('あ'.repeat(31))).toBe(`提案：${'あ'.repeat(30)}…`);
  });

  it('30文字目が絵文字でも途中で切らない', () => {
    expect(proposalTitle(`${'あ'.repeat(29)}👨‍👩‍👧‍👦あ`)).toBe(`提案：${'あ'.repeat(29)}👨‍👩‍👧‍👦…`);
  });

  it('2行目以降は入らない', () => {
    expect(proposalTitle('一行目\n二行目')).toBe('提案：一行目');
  });

  it('" と \\ は全角に置き換わる', () => {
    expect(proposalTitle('a"b\\c')).toBe('提案：a＂b＼c');
  });
});

describe('proposalSummary', () => {
  it('100文字ちょうどは「…」なし、101文字は100文字＋「…」', () => {
    expect(proposalSummary('あ'.repeat(100))).toBe('あ'.repeat(100));
    expect(proposalSummary('あ'.repeat(101))).toBe(`${'あ'.repeat(100)}…`);
  });

  it('100文字目が絵文字でも途中で切らない', () => {
    expect(proposalSummary(`${'あ'.repeat(99)}👨‍👩‍👧‍👦あ`)).toBe(`${'あ'.repeat(99)}👨‍👩‍👧‍👦…`);
  });

  it('タブなどの制御文字は空白になる', () => {
    expect(proposalSummary('a\tb\u0007c')).toBe('a b c');
    expect(proposalTitle('a\tb')).toBe('提案：a b');
  });

  it('改行（LF・CRLF）は空白1つになる', () => {
    expect(proposalSummary('a\nb\r\nc')).toBe('a b c');
  });

  it('" と \\ は全角に置き換わる', () => {
    expect(proposalSummary('a"b\\c')).toBe('a＂b＼c');
  });
});
