# 既知の問題

わかっているが、まだ直していない問題を並べる。直したら消す。人間の判断を待つものは、見出しに「判断待ち」を入れる（[ダッシュボード](/)に出る）。要望（何を実現するか）の判断待ちは、要望のファイルの `decisions` に書き、ここには書かない。

## 画面

いまは無い。

## ドメインモデル

いまは無い。

## テスト

いまは無い。

## 依存

- mermaid を 11 に留めている（P3、2026-10-30）。`vitepress-plugin-mermaid` 2.0.17（最新）の peer が `mermaid` `10 || 11` で、12 は警告になる。プラグインが 12 を peer で許したら上げる

## 見送った軽微な指摘（P2）

レビューの P2 を1行で記録する（[レビューのルール](../process/rules/review.md)）。

- P1 の持ち込み（2026-10-30）：`.gitignore` に、置いていった `rule:report`・`/rule-test-report/`・`scenarioFilePlugin`・`scenarios/.*.tmp` の行が残っている
- 同：`.claude/agents/spec-reviewer.md` が、持ち込んでいない `rulebook.ts` を確かめる手順を持っている
- 同：`scripts/check-screens.mjs` の `NOT_IN_DIAGRAM = ['admin']` が、元のルートのグループのまま
- 同：使われていない依存（`packages/schemas` の `@cartagraph/domain`）と、`apps/web/tsconfig.json` の include の無いディレクトリ `vite`
- 同：`scripts/build-trace-report.test.mjs:530` の、R8 で置き換えた通しの確かめ（`req:foundation` は trace が none で、skipped になりえない）。単体は :453 が確かめている
- 同：`scripts/check-doc-anchors.mjs` は、`rulebook.ts` が無ければ黙って 0 件で通る（置き場所を変えると検査が外れたままになる）
- 同：`scripts/check-events.mjs` の `section()` は、見出しが無いと空文字を返す。表が空の今は、見出しを消しても 0 件で通る
- 同：`docs/.vitepress/backlog.data.ts` は、要望の `status` の綴り違いを止めない（並びが先頭になり、バッジが出ないだけ）
- 同：`packages/schemas` の一覧が空なので、`endpoints.test.ts` の重複・`/api` の検査が何も確かめていない。`openapi.ts` の `tagOf` は、パスが `/` だと空のタグを返す（最初の API を足すときに見る）
- 同：`scripts/branch-id.mjs` の `readMergedPlans` は、ローカルに `main` が無いクローンでは黙って 0 件になる（元と同じ）
- 同：`docs/process/` の `spec-writing.md`・`static-analysis.md`・`testing.md` が「前のリポジトリの…」と書く（リポジトリ名を書いたほうが読みやすい）
- 同：`docs/open-questions.md`「遊んだことの持ち方」が「どの形（イベントの列など）で持つか」を未決と書くが、ロードマップはイベントの列と決めている
- 同：進化ログの置いていったものは「却下」の節にあり、プランの「候補として書く」と違う。D4 の `widgets/`・`entities/` は作っていない（空のディレクトリは git に載らない）。`.gitattributes` の先頭のコメントが消えた
- 同：`docs/process/rules/review.md:18`・`testing.md:49` が、まだ無い playable-scene の書き込みの口の規則を持っている
- 同（2回目）：`scripts/` のテストのデータ（`check-events`・`check-trace`・`build-trace-report`・`build-usecase-report`・`check-screens` などの `*.test.mjs`）に、元のゲームの語（GM・セッション・シナリオの公開・自動戦闘）が残っている。見本なので動きには関わらない
- P3 の実装レビュー（2026-10-30）：`scripts/copy-test-reports-to-pages.mjs` は `.vitest/` が無いと警告だけで exit 0 になる（テストが落ちてもデプロイは進める方針のため）。出力先がまた変わると、Pages にレポートが載らないまま CI が緑になる
- 同：`scripts/check-usecase-tags.test.mjs` の `stops`・`bad` は、真なら `true`、偽なら失敗の文を返す形（`assert.equal(…, true)`）で、プランに書いた `assert.ok(….some(…))` を本文に置く形と違う（判定は同じ）
- 同：`biome.json` のテストの override の `apps/web/e2e/**`・`src/test/**` は、テストでないヘルパーにも `useExpect` などがかかる（`expect` を持たないヘルパーは対象外で、いまは無害）
- 同：`packages/schemas/src/body/parse.ts` のコメント「MSW のハンドラ。まだ無い」は、ハンドラを足したときに直す
- 同：進化ログ（48件）と `docs/backlog/dependency-upgrade.md`（`useConsistentTestIt` 32件）の件数は、`smoke.test.ts` を含めるかの数え方の違い
- P4 の実装レビュー（2026-10-31）：`ExamPage.tsx` は、名前の入力欄を開いていないときの断る理由（`unknownCard`）を画面に出さない。名前の要らないカードを足すときに見る
- 同：`ExamPage.tsx` の段落の `key` が本文の文字列で、同じ段落が2つあるシーンでは key がぶつかる
- 同：`ExamPage.tsx` はシーンが見つからないと描画中に例外を投げ、エラー境界が無いので白くなる（参照の切れは読み込みで止まるので、今は届かない）
- 同：`transition.ts` は `Intl.Segmenter` をモジュールの読み込み時に作る。無いブラウザではアプリ全体が開かない（対象のブラウザの下限は決めていない）
- 同：`scenario/model.ts` の `id`・`title` に空文字を断る決まりが無い
- 同：`scenario/test-scenario.ts` はテスト専用だが `*.test.ts` でないので、`exports` から import でき、テストの override もかからない
- 同：`scenario/model.ts` の `playStateSchema` は型を導くのにだけ使い、`parse` していない（イベントの列を作るときに見る）
- 同：`examScene.test.tsx` の `new RegExp(introduce.title)` は題名をエスケープしていない。二重押しのテストは、1回目でフォームが外れるので2回目の送信が届いているかは確かめていない。画面で10文字ちょうどが通ることは確かめていない（ドメインのテストが見ている）
- 同：「名前を書くカード」は用語集に無い（コードは `asksCharacterName`）。core-loop の完成の条件の一部を先に作ったことは、`docs/roadmap.md` からは読めず、ノートにだけある
