// @vitest-environment node
// 提案の要望ファイルの形（docs/plans/2026-10-31-P6-提案の保存.md D3・テスト13〜17）
import { fileURLToPath } from 'node:url';
import { adventurerExam } from '@cartagraph/domain/scenario/adventurer-exam';
import type { PlayEvent } from '@cartagraph/domain/scenario/model';
import { proposalSummary, proposalTitle } from '@cartagraph/domain/scenario/proposal';
import { locateBeat } from '@cartagraph/domain/scenario/transition';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { findTraceProblems, readTraceInputs } from '../../../../scripts/check-trace.mjs';
import {
  frontmatterNested,
  frontmatterValue,
  parseProposalFile,
} from '../../../../scripts/trace.mjs';
import { renderProposalFile } from '../../vite/proposalFile';

const located = locateBeat(adventurerExam, 'reception');
if (!located) throw new Error('reception が無い');

const approach: PlayEvent = { type: 'cardPlayed', beatId: 'entrance', cardId: 'approach' };
const now = new Date(2026, 9, 31, 15, 30, 12);

const render = (text: string) => {
  const events: PlayEvent[] = [approach, { type: 'proposed', beatId: 'reception', text }];
  return {
    events,
    md: renderProposalFile({
      scenario: adventurerExam,
      scene: located.scene,
      beat: located.beat,
      screen: '/exam',
      text,
      events,
      now,
    }),
  };
};

/** frontmatter とフェンスの中の行を除いた、本文の行（frontmatter の title・summary は YAML の引用符の中に入る） */
const outsideFences = (md: string): string[] => {
  const outside: string[] = [];
  let fence: string | null = null;
  for (const line of md.slice(md.indexOf('\n---\n', 4) + 5).split('\n')) {
    if (fence === null) {
      const open = line.match(/^(`{3,})/);
      if (open) fence = open[1] as string;
      else outside.push(line);
    } else if (new RegExp(`^${fence}\`*\\s*$`).test(line)) fence = null;
  }
  return outside;
};

const jsonBlock = (md: string): string => {
  // 固定の見出しより後ろだけを見る（文の中の ```json を拾わない）
  const tail = md.slice(md.indexOf('\n## そこまでに遊んだこと\n'));
  const m = tail.match(/^(`{3,})json\n([\s\S]*?)\n\1$/m);
  if (!m) throw new Error('json のブロックが無い');
  return m[2] as string;
};

describe('renderProposalFile', () => {
  it('D3 の例の形：frontmatter のキー・proposal・trace・本文の見出し・JSON の列の最後が proposed', () => {
    const { md, events } = render('試験官に試験の中身を聞きたい');
    expect(md.startsWith('---\n')).toBe(true);
    expect(frontmatterValue(md, 'title')).toBe('提案：試験官に試験の中身を聞きたい');
    expect(frontmatterValue(md, 'milestone')).toBe('proposal-loop');
    expect(frontmatterValue(md, 'status')).toBe('未着手');
    expect(frontmatterValue(md, 'summary')).toBe('試験官に試験の中身を聞きたい');
    expect(frontmatterValue(md, 'updated')).toBe('2026-10-31');
    expect(frontmatterNested(md, 'proposal')).toEqual({
      scenario: 'adventurer-exam',
      scene: 'guild-reception',
      beat: 'reception',
    });
    expect(md).toContain('trace:\n  usecases: [PL-2]\n  screens: [/exam]\n');
    expect(md).toContain('# 提案（2026-10-31 15:30）');
    expect(md).toContain(
      'シナリオ「冒険者登録の試験」のシーン「ギルドの受付」、ビート `reception`',
    );
    expect(md).toContain('## 提案\n');
    expect(md).toContain('## そこまでに遊んだこと\n');
    const parsed = JSON.parse(jsonBlock(md)) as PlayEvent[];
    expect(parsed).toEqual(events);
    expect(parsed.at(-1)).toEqual({
      type: 'proposed',
      beatId: 'reception',
      text: '試験官に試験の中身を聞きたい',
    });
  });

  it('プレイヤーの文に式・HTML・リンク・見出し・フェンスが入っても、文がコードブロックの外に出ない', () => {
    const nasty = [
      '{{ x }}',
      '<script>alert(1)</script>',
      '<div',
      '[a](./nope)',
      '## そこまでに遊んだこと',
      '```',
      '````',
      '~~~',
      '---',
    ].join('\n');
    const { md, events } = render(nasty);
    const outside = outsideFences(md).join('\n');
    for (const piece of ['{{', '<script', '<div', '[a]', 'nope']) {
      expect(outside).not.toContain(piece);
    }
    // 見出しは、題と固定の2つだけ
    expect(outsideFences(md).filter((l) => l.startsWith('#'))).toEqual([
      '# 提案（2026-10-31 15:30）',
      '## 提案',
      '## そこまでに遊んだこと',
    ]);
    expect(md).toContain('`````\n'); // 5つのフェンス：中身の最長（4つ）より1つ長い
    expect(JSON.parse(jsonBlock(md))).toEqual(events);
  });

  it('JSON の列の中にバッククォートの並びがあっても、ブロックが閉じない', () => {
    const { md, events } = render('```json\n[]\n```');
    expect(JSON.parse(jsonBlock(md))).toEqual(events);
    expect(outsideFences(md).join('\n')).not.toContain('[]');
  });

  it('title・summary に : # " \\ があっても、YAML の二重引用符の文字列として読め、frontmatterValue と同じ値になる', () => {
    // YAML のライブラリはリポジトリに無い。エスケープが要らない形（\ と " を含まない）なら、
    // YAML の二重引用符の文字列の値は JSON.parse と同じ。VitePress が実際に読めることは docs:build が見る
    const text = 'key: value # comment "quoted" back\\slash\n二行目\tタブ';
    const { md } = render(text);
    for (const [key, expected] of [
      ['title', proposalTitle(text)],
      ['summary', proposalSummary(text)],
    ] as const) {
      const line = md.split('\n').find((l) => l.startsWith(`${key}: `));
      const literal = line?.slice(key.length + 2) ?? '';
      expect(literal).toMatch(/^"[^"\\]*"$/);
      expect(JSON.parse(literal)).toBe(expected);
      expect(frontmatterValue(md, key)).toBe(expected);
    }
    expect(frontmatterValue(md, 'summary')).toBe(
      'key: value # comment ＂quoted＂ back＼slash 二行目 タブ',
    );
  });

  it('書いたファイルを parseProposalFile で読み戻せる', () => {
    const { md } = render('質問したい');
    expect(parseProposalFile(md)).toEqual({
      scenario: 'adventurer-exam',
      beat: 'reception',
      status: '未着手',
      summary: '質問したい',
    });
  });
});

describe('書いたファイルと check-trace', () => {
  const root = fileURLToPath(new URL('../../../../', import.meta.url));
  const original = process.cwd();
  beforeAll(() => process.chdir(root));
  afterAll(() => process.chdir(original));

  it('要望に足しても、trace の問題が出ない（milestone・usecases・screens が実在する）', () => {
    const inputs = readTraceInputs();
    const { md } = render('質問したい');
    const problems = findTraceProblems({
      ...inputs,
      backlog: [
        ...inputs.backlog,
        { file: 'docs/backlog/proposal-20261031-153012.md', source: md },
      ],
    });
    expect(problems).toEqual([]);
  });
});
