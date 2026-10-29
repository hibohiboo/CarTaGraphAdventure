// 文書が指すスクリプト・pnpm のスクリプト・検査の名前が実在するかを確かめる（pnpm docs:build の最後に流れる。pre-push・CI でも止まる）。
// 消した・移した・持ち込まなかった検査を、文書が「止める」と書いたまま残すと、エージェントが止まるはずだと信じて通す
// （P1 の AI レビューの A2・A7・B1。前のリポジトリでも、関数を移したのに文書の置き場所が古いまま残った）。
//
// 使い方: node scripts/check-doc-refs.mjs
// 見るのは git で管理している Markdown のうち isChecked が真のものの、コード（インラインの `…` とコードブロック）だけ。
// 拾うのは `scripts/…`・`.claude/hooks/…`・`.githooks/…` のパス（`scripts/biome/**` のようなグロブは範囲なので見ない）、`xxx.mjs` のファイル名、`check-xxx` の名前、`pnpm <スクリプト>`。
// 経緯の記録（plans・体制の進化ログ）と、まだ無いものを書く場所（要望・デザイナーノート）は見ない。
// 持ち込まなかったものをわざと指す行は、「前のリポジトリ」と書けば見ない（例：前のリポジトリの `check-suppressions.mjs`）。
// テストは scripts/check-doc-refs.test.mjs（pnpm tools:test）。

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXCLUDED = [
  /^docs\/plans\//,
  /^docs\/backlog\//,
  /^docs\/notes\//,
  /^docs\/process\/evolution\.md$/,
  /^docs\/process\/evolution\//,
  /^\.claude\/skills\/react-best-practices\//,
  /\/dist\//,
];

/** この印がある行は見ない（持ち込まなかったものを、わざと指している） */
const SKIP_LINE = '前のリポジトリ';

/** pnpm 自身のコマンド（スクリプトの名前ではない） */
const PNPM_COMMANDS = new Set([
  'install',
  'i',
  'add',
  'remove',
  'update',
  'exec',
  'dlx',
  'run',
  'test',
  'workspace',
  'why',
  'list',
  'outdated',
  'audit',
  'store',
  'approve-builds',
]);

/** その（リポジトリからの相対）パスを見るか */
export function isChecked(path) {
  return path.endsWith('.md') && !EXCLUDED.some((re) => re.test(path));
}

/** 1ファイルのコードの部分を、行番号つきで返す。[{ line, code }] */
export function codeSegments(text) {
  let inFence = false;
  return text.split('\n').flatMap((lineText, i) => {
    if (/^\s*(```|~~~)/.test(lineText)) {
      inFence = !inFence;
      return [];
    }
    if (lineText.includes(SKIP_LINE)) return [];
    if (inFence) return [{ line: i + 1, code: lineText }];
    return [...lineText.matchAll(/`([^`]+)`/g)].map((m) => ({ line: i + 1, code: m[1] }));
  });
}

/** コードの断片から、確かめる参照を拾う。[{ ref, kind }] */
export function refsIn(code) {
  const refs = [];
  for (const m of code.matchAll(
    /(?<![\w/.-])((?:scripts|\.claude\/hooks|\.githooks)\/[\w.-][\w./-]*\w)(?::\d+)?(?![\w./*-])/g,
  ))
    refs.push({ ref: m[1], kind: 'path' });
  for (const m of code.matchAll(/(?<![\w/.-])([\w-]+\.mjs)(?![\w.-])/g))
    refs.push({ ref: m[1], kind: 'file' });
  for (const m of code.matchAll(/(?<![\w/.:-])(check-[a-z][a-z0-9-]*)(?![\w.-])/g))
    refs.push({ ref: m[1], kind: 'check' });
  for (const m of code.matchAll(/\bpnpm\s+(?:-[\w-]+\s+)*([a-z][\w:-]*)/g))
    if (!PNPM_COMMANDS.has(m[1])) refs.push({ ref: m[1], kind: 'pnpm' });
  return refs;
}

/**
 * 実在しない参照を見つける。[{ path, line, ref, message }]
 * repo：{ exists(path), fileNames: Set（管理しているファイルの名前）, pnpmScripts: Set（ルートの package.json の scripts） }
 */
export function findMissingRefs(files, repo) {
  const found = {
    path: (ref) => repo.exists(ref),
    file: (ref) => repo.fileNames.has(ref),
    check: (ref) => repo.exists(`scripts/${ref}.mjs`),
    pnpm: (ref) => repo.pnpmScripts.has(ref),
  };
  const what = {
    path: 'ファイルが無い',
    file: 'その名前のファイルが無い',
    check: 'scripts/ に無い',
    pnpm: 'package.json の scripts に無い',
  };
  return files.flatMap(({ path, text }) =>
    codeSegments(text).flatMap(({ line, code }) =>
      refsIn(code)
        .filter(({ ref, kind }) => !found[kind](ref))
        .map(({ ref, kind }) => ({
          path,
          line,
          ref,
          message: `${path}:${line} \`${ref}\` が${what[kind]}`,
        })),
    ),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const tracked = spawnSync('git', ['ls-files'], { encoding: 'utf8' })
    .stdout.split('\n')
    .filter(Boolean);
  const paths = tracked.filter(isChecked);
  const repo = {
    exists: existsSync,
    fileNames: new Set(tracked.map((p) => basename(p))),
    pnpmScripts: new Set(Object.keys(JSON.parse(readFileSync('package.json', 'utf8')).scripts)),
  };
  const missing = findMissingRefs(
    paths.map((path) => ({ path, text: readFileSync(path, 'utf8') })),
    repo,
  );
  if (missing.length) {
    for (const m of missing) console.error(m.message);
    console.error(
      `文書が指すものが ${missing.length} 件見つかりません（持ち込まなかったものをわざと指すなら、同じ行に「前のリポジトリ」と書く）`,
    );
    process.exit(1);
  }
  console.log(
    `文書が指すスクリプト・検査・pnpm のスクリプトはすべて実在します（${paths.length} ファイル）`,
  );
}
