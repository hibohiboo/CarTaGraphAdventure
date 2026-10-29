// check-doc-refs.mjs の、文書が指すものの実在の検査（pnpm tools:test）。見本のリポジトリを渡して確かめる

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { codeSegments, findMissingRefs, isChecked, refsIn } from './check-doc-refs.mjs';

const repo = {
  exists: (p) => ['scripts/check-terms.mjs', '.githooks/pre-push'].includes(p),
  fileNames: new Set(['check-terms.mjs', 'rule-sections.mjs']),
  pnpmScripts: new Set(['docs:build', 'web:dev:agent']),
};
const missing = (text) => findMissingRefs([{ path: 'docs/a.md', text }], repo).map((m) => m.ref);

describe('refsIn', () => {
  it('パス・ファイル名・検査の名前・pnpm のスクリプトを拾う', () => {
    assert.deepEqual(
      refsIn('node scripts/check-terms.mjs && pnpm docs:build').map((r) => [r.kind, r.ref]),
      [
        ['path', 'scripts/check-terms.mjs'],
        ['pnpm', 'docs:build'],
      ],
    );
    assert.deepEqual(refsIn('rule-sections.mjs'), [{ ref: 'rule-sections.mjs', kind: 'file' }]);
    assert.deepEqual(refsIn('check-plan-pr-draft'), [
      { ref: 'check-plan-pr-draft', kind: 'check' },
    ]);
  });

  it('pnpm の前置きの旗は読み飛ばし、pnpm 自身のコマンドは拾わない', () => {
    assert.deepEqual(refsIn('pnpm -w web:dev:agent'), [{ ref: 'web:dev:agent', kind: 'pnpm' }]);
    assert.deepEqual(refsIn('pnpm install'), []);
    assert.deepEqual(refsIn('pnpm exec playwright install'), []);
    assert.deepEqual(refsIn('pnpm --filter @cartagraph/web dev'), []);
  });

  it('パスの行番号とグロブは、ファイルの有無に使わない', () => {
    assert.deepEqual(refsIn('scripts/check-terms.mjs:530'), [
      { ref: 'scripts/check-terms.mjs', kind: 'path' },
    ]);
    assert.deepEqual(refsIn('scripts/*.test.mjs'), []);
    assert.deepEqual(refsIn('scripts/biome/**'), []);
    assert.deepEqual(refsIn('scripts/biome/*.grit'), []);
  });
});

describe('codeSegments', () => {
  it('インラインのコードとコードブロックの中だけを、行番号つきで返す', () => {
    const text = 'check-x は地の文\n`a` と `b`\n```sh\npnpm x\n```\n後ろ';
    assert.deepEqual(codeSegments(text), [
      { line: 2, code: 'a' },
      { line: 2, code: 'b' },
      { line: 4, code: 'pnpm x' },
    ]);
  });

  it('「前のリポジトリ」と書いた行は見ない', () => {
    assert.deepEqual(codeSegments('前のリポジトリの `check-suppressions.mjs`'), []);
  });
});

describe('findMissingRefs', () => {
  it('実在するものは通す', () => {
    assert.deepEqual(
      missing(
        '`scripts/check-terms.mjs`・`check-terms`・`rule-sections.mjs`・`pnpm docs:build`・`scripts/biome/**`・`.githooks/pre-push`',
      ),
      [],
    );
  });

  it('無いスクリプト・検査・pnpm のスクリプトを、ファイルと行つきで見つける', () => {
    const found = findMissingRefs(
      [
        {
          path: 'docs/a.md',
          text: '一行目\n`check-plan-pr-draft` が止める\n`node scripts/gone.mjs`\n`pnpm web:check:all`\n`gone.mjs`',
        },
      ],
      repo,
    );
    assert.deepEqual(
      found.map((f) => [f.line, f.ref]),
      [
        [2, 'check-plan-pr-draft'],
        [3, 'scripts/gone.mjs'],
        [4, 'web:check:all'],
        [5, 'gone.mjs'],
      ],
    );
    assert.match(found[0].message, /^docs\/a\.md:2 /);
  });
});

describe('isChecked', () => {
  it('経緯の記録と、まだ無いものを書く場所は見ない', () => {
    assert.equal(isChecked('docs/process/rules/testing.md'), true);
    assert.equal(isChecked('.claude/skills/create-pr/SKILL.md'), true);
    assert.equal(isChecked('AGENTS.md'), true);
    for (const p of [
      'docs/plans/2026-10-30-P1-x.md',
      'docs/backlog/foundation.md',
      'docs/notes/roadmap.md',
      'docs/process/evolution.md',
      'docs/process/evolution/2026-10.md',
      '.claude/skills/react-best-practices/AGENTS.md',
      'scripts/a.mjs',
    ])
      assert.equal(isChecked(p), false, p);
  });
});
