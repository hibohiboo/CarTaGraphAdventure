// trace.mjs（要望の frontmatter の読み手）のテスト（pnpm tools:test）

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { frontmatterNested, frontmatterValue, parseProposalFile, parseTrace } from './trace.mjs';

describe('frontmatterValue', () => {
  it('引用符・コメントを外し、frontmatter の外（本文）は読まない', () => {
    const md = '---\ntitle: "題 #1"\nstatus: 完了 # 暫定\n---\n\nstatus: 本文\nsummary: x\n';
    assert.equal(frontmatterValue(md, 'title'), '題 #1');
    assert.equal(frontmatterValue(md, 'status'), '完了');
    assert.equal(frontmatterValue(md, 'summary'), '');
    assert.equal(frontmatterValue('status: 完了\n', 'status'), '');
  });
});

describe('frontmatterValue（CRLF）', () => {
  it('CRLF の行末でも値を読める（引用符もコメントも外す）', () => {
    const md = '---\r\ntitle: "題"\r\nstatus: 完了 # 暫定\r\n---\r\n\r\n本文\r\n';
    assert.equal(frontmatterValue(md, 'title'), '題');
    assert.equal(frontmatterValue(md, 'status'), '完了');
  });
});

describe('frontmatterNested', () => {
  it('入れ子のキーの値を読む（引用符を外す）。入れ子が無いキーは null', () => {
    const md =
      '---\ntitle: 題\nproposal:\n  scenario: adventurer-exam\n  beat: "reception"\nupdated: 2026-10-31\n---\n';
    assert.deepEqual(frontmatterNested(md, 'proposal'), {
      scenario: 'adventurer-exam',
      beat: 'reception',
    });
    assert.equal(frontmatterNested(md, 'trace'), null);
    assert.equal(frontmatterNested('本文だけ\n', 'proposal'), null);
  });

  it('入れ子の外のキーや本文は拾わず、CRLF でも読める', () => {
    const md = '---\r\nproposal:\r\n  scenario: s\r\nbeat: top\r\n---\r\n\r\n  beat: body\r\n';
    assert.deepEqual(frontmatterNested(md, 'proposal'), { scenario: 's' });
  });
});

const proposal = (extra = '') =>
  `---\ntitle: "提案：質問"\nmilestone: proposal-loop\nstatus: 未着手\nsummary: "質問したい"\nproposal:\n  scenario: adventurer-exam\n  scene: guild-reception\n  beat: reception\ntrace:\n  usecases: [PL-2]\n  screens: [/exam]\nupdated: 2026-10-31\n---\n\n# 提案\n${extra}`;

describe('parseProposalFile', () => {
  it('書いたものを読み戻せる', () => {
    assert.deepEqual(parseProposalFile(proposal()), {
      scenario: 'adventurer-exam',
      beat: 'reception',
      status: '未着手',
      summary: '質問したい',
    });
  });

  it('人間が status を「完了」「見送り」に直したものを読める', () => {
    for (const status of ['完了', '見送り']) {
      const md = proposal().replace('status: 未着手', `status: ${status}`);
      assert.equal(parseProposalFile(md)?.status, status);
    }
  });

  it('CRLF で保存したものを読める', () => {
    const md = proposal().replaceAll('\n', '\r\n');
    assert.deepEqual(parseProposalFile(md), {
      scenario: 'adventurer-exam',
      beat: 'reception',
      status: '未着手',
      summary: '質問したい',
    });
  });

  it('proposal: の無い要望・scenario か beat の欠けたものは null', () => {
    assert.equal(parseProposalFile('---\ntitle: 題\nstatus: 完了\n---\n本文\n'), null);
    assert.equal(parseProposalFile(proposal().replace('  beat: reception\n', '')), null);
    assert.equal(parseProposalFile(proposal().replace('  scenario: adventurer-exam\n', '')), null);
    assert.equal(parseProposalFile('本文だけ\n'), null);
  });
});

const doc = (traceLines) => `---\nstatus: 完了\n${traceLines}\ntitle: 題\n---\n\n本文\n`;
const FILE = 'docs/backlog/x.md';

describe('T1: 読む', () => {
  it('3つのリストを読む', () => {
    const md = doc(
      [
        'trace:',
        '  usecases: [SC-6, SC-7]',
        '  screens: [/creator/scenarios/:scenarioId, GM のホーム]',
        '  rules: [scenario-flow/シナリオの公開]',
      ].join('\n'),
    );
    assert.deepEqual(parseTrace(md, FILE), {
      usecases: ['SC-6', 'SC-7'],
      screens: ['/creator/scenarios/:scenarioId', 'GM のホーム'],
      rules: ['scenario-flow/シナリオの公開'],
    });
  });

  it('リストの一部の省略と空のリストを受け付ける（省略は空として返す）', () => {
    const md = doc('trace:\n  usecases: [SC-1]\n  rules: []');
    assert.deepEqual(parseTrace(md, FILE), { usecases: ['SC-1'], screens: [], rules: [] });
  });

  it('none を読む', () => {
    assert.deepEqual(parseTrace(doc('trace:\n  none: 開発の基盤（E2E の導入）'), FILE), {
      none: '開発の基盤（E2E の導入）',
    });
  });

  it('trace が無いと null。frontmatter が無くても null', () => {
    assert.equal(parseTrace(doc(''), FILE), null);
    assert.equal(parseTrace('本文だけ\n', FILE), null);
  });

  it('CRLF でも読める', () => {
    const md = doc('trace:\n  usecases: [SC-1]').replaceAll('\n', '\r\n');
    assert.deepEqual(parseTrace(md, FILE), { usecases: ['SC-1'], screens: [], rules: [] });
  });

  it('本文の中の trace: は読まない', () => {
    assert.equal(parseTrace('---\nstatus: 完了\n---\n\ntrace:\n  none: x\n', FILE), null);
  });
});

describe('T2: 形の違いは、ファイル名と理由の入った例外', () => {
  const parse = (traceLines) => () => parseTrace(doc(traceLines), FILE);
  const rejects = (reason) => (e) => e.message.includes(FILE) && reason.test(e.message);

  it('ブロック形式のリスト', () => {
    assert.throws(parse('trace:\n  usecases:\n    - SC-1'), rejects(/フロー形式/));
  });
  it('none とリストの両方', () => {
    assert.throws(
      parse('trace:\n  none: 理由\n  usecases: [SC-1]'),
      rejects(/none.*リスト|リスト.*none/),
    );
  });
  it('全部が空・何も書いていない', () => {
    assert.throws(parse('trace:\n  usecases: []\n  screens: []'), rejects(/全部が空/));
    assert.throws(parse('trace:\n  usecases:'), rejects(/フロー形式/));
  });
  it('知らないキー', () => {
    assert.throws(parse('trace:\n  usecase: [SC-1]'), rejects(/知らないキー.*usecase/));
  });
  it('trace の下にインデントの無い行・インデントの無い値', () => {
    assert.throws(parse('trace:\nusecases: [SC-1]'), rejects(/インデント/));
    assert.throws(parse('trace: [SC-1]'), rejects(/インデント/));
  });
  it('# と引用符（YAML と読み方が食い違う）', () => {
    assert.throws(parse('trace:\n  none: 理由 #メモ'), rejects(/#/));
    assert.throws(parse("trace:\n  none: 'x'"), rejects(/引用符/));
    assert.throws(parse('trace:\n  screens: ["/home"]'), rejects(/引用符/));
  });
  it('none の理由が空', () => {
    assert.throws(parse('trace:\n  none:'), rejects(/理由が空/));
    assert.throws(parse('trace:\n  none:   '), rejects(/理由が空/));
  });
  it('リストの中身が空の項目・閉じていない', () => {
    assert.throws(parse('trace:\n  usecases: [SC-1, ]'), rejects(/空の項目/));
    assert.throws(parse('trace:\n  usecases: [SC-1'), rejects(/フロー形式/));
  });
  it('同じキーが2回', () => {
    assert.throws(parse('trace:\n  usecases: [SC-1]\n  usecases: [SC-2]'), rejects(/2回/));
  });
});
