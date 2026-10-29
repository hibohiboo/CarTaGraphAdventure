// check-terms.mjs の、旧称の検出（pnpm tools:test）。本物の一覧はまだ空なので、見本の一覧を渡して確かめる

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findOldTerms, isChecked } from './check-terms.mjs';

const NOTES = [/^docs\/notes\//];
const terms = [
  ['山札', '「手札」（docs/glossary.md）'],
  ['要求', '「提案」（docs/glossary.md）'],
  ['場面', '「シーン」（docs/glossary.md）', NOTES],
];

describe('findOldTerms', () => {
  it('旧称を、ファイル・行・今の名前つきで見つける', () => {
    const found = findOldTerms(
      [
        { path: 'docs/a.md', text: '一行目\n山札から出す\nGM への要求' },
        { path: 'apps/web/src/b.tsx', text: "const s = '山札';" },
      ],
      terms,
    );
    assert.deepEqual(
      found.map((f) => [f.path, f.line, f.term]),
      [
        ['docs/a.md', 2, '山札'],
        ['docs/a.md', 3, '要求'],
        ['apps/web/src/b.tsx', 1, '山札'],
      ],
    );
    assert.match(found[0].message, /手札/);
  });

  it('今の名前は見つけない', () => {
    assert.deepEqual(findOldTerms([{ path: 'docs/a.md', text: '手札・提案・シーン' }], terms), []);
  });

  it('1行に複数の旧称があれば、全部見つける', () => {
    const found = findOldTerms([{ path: 'x.md', text: '山札と要求' }], terms);
    assert.deepEqual(
      found.map((f) => f.term),
      ['山札', '要求'],
    );
  });

  it('本物の一覧（いまは空）では何も見つけない', () => {
    assert.deepEqual(findOldTerms([{ path: 'docs/a.md', text: '山札と要求と場面' }]), []);
  });
});

describe('findOldTerms：語ごとの除外', () => {
  it('除外のパスではその語を見つけず、ほかのパスでは見つける', () => {
    assert.deepEqual(findOldTerms([{ path: 'docs/notes/a.md', text: '場面' }], terms), []);
    assert.deepEqual(
      findOldTerms([{ path: 'docs/cartagraph/a.md', text: '場面' }], terms).map((f) => f.term),
      ['場面'],
    );
  });

  it('同じファイルでも、除外されていない別の語は見つける', () => {
    const found = findOldTerms([{ path: 'docs/notes/a.md', text: '場面で山札' }], terms);
    assert.deepEqual(
      found.map((f) => f.term),
      ['山札'],
    );
  });
});

describe('isChecked', () => {
  it('docs・apps・packages と入口の文書を見る', () => {
    for (const p of [
      'docs/cartagraph/index.md',
      'apps/web/src/a.tsx',
      'packages/domain/src/a.ts',
      'AGENTS.md',
    ])
      assert.ok(isChecked(p), p);
  });

  it('経緯の記録（plans・interviews・進化ログ）、この検査自身、ビルドの成果物は見ない', () => {
    for (const p of [
      'docs/plans/2026-10-06-x.md',
      'docs/interviews/a.md',
      'docs/process/evolution.md',
      'docs/process/evolution/2026-09.md',
      'scripts/check-terms.mjs',
      'scripts/check-terms.test.mjs',
      'docs/.vitepress/dist/a.html',
      'pnpm-lock.yaml',
    ])
      assert.ok(!isChecked(p), p);
  });
});
