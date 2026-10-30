---
paths:
  - "biome.json"
  - "scripts/biome/**"
---

# 静的解析ルール（Biome で止めるもの）

コードの品質を、人やAIの注意ではなく機械で保つための設定と、その理由を置く。検査は Biome（lint・整形）が担い、コミット前のフック（`.githooks/pre-commit`）と CI の `pnpm lint` で必ず回る（コマンドは `AGENTS.md`）。型の検査は `tsc`、用語の旧称は `pnpm docs:build` の `scripts/check-terms.mjs`、画面一覧・導線図とルート定義の食い違いは同じく `scripts/check-screens.mjs` が止める。

**設定の正は `biome.json`、理由はこのページ。** `biome.json` にはコメントを書けない（書くと設定の読み込みが失敗し、既定の整形が当たる）。ルールを足す・外す・しきい値を変えるときは、`biome.json` とこのページを一緒に直す。

## 有効にしているルール

Biome の推奨ルール（`"preset": "recommended"`）に加えて、次のルールを有効にしている。理由をほかのページに書いているものは、そのページが正。

| 目的 | ルール | 理由の置き場所 |
|---|---|---|
| コードの複雑さ | `complexity/noExcessiveCognitiveComplexity` など4つ | 下の「コードの複雑さ」 |
| 依存の向き・置き場所 | `style/noRestrictedImports`（層・ディレクトリごとの overrides）、`suspicious/noImportCycles`、`performance/noBarrelFile`・`noReExportAll` | [アーキテクチャルール](architecture.md)「依存の向き」「packages/domain の中の置き場所」「packages/schemas の中の置き場所」「境界」 |
| React の書き方 | `correctness/noNestedComponentDefinitions`・`useHookAtTopLevel` | [アーキテクチャルール](architecture.md)「React の書き方」 |
| 消し忘れ | `correctness/noUnusedVariables`・`noUnusedImports`、`suspicious/noConsole` | [アーキテクチャルール](architecture.md)「境界」（`console.*`） |
| テスト | `suspicious/noSkippedTests`・`noFocusedTests`（`linter.domains.test` は `"all"`） | [テストルール](testing.md) |
| テストの書き方 | `style/useConsistentTestIt`・`suspicious/useExpect`・`noConditionalExpect`（テストの override で `error`） | 下の「テストの書き方」 |

## コードの複雑さ

読みにくく、壊れやすい関数を早めに止める。SonarJS（SonarQube の JavaScript 用ルール）の中心にある考え方を、Biome に同じ考えのルールがあるものだけ入れた（2026-10-09）。しきい値は、迷ったら SonarJS の既定に合わせる。

| ルール | しきい値 | SonarJS の対応 | 何を止めるか |
|---|---|---|---|
| `complexity/noExcessiveCognitiveComplexity` | 15 | `cognitive-complexity`（既定15） | 分岐・ループ・入れ子が深く、頭の中で追いきれない関数 |
| `complexity/noExcessiveLinesPerFunction` | 200行 | S138（関数の行数、既定200） | 1つの関数に詰め込みすぎた処理。テストは対象外（下の overrides） |
| `style/noExcessiveLinesPerFile` | 1000行 | S104（ファイルの行数、既定1000） | 責務の割れていないファイル（「1ファイル1責務」の機械的な目安） |
| `complexity/useMaxParams` | 4個 | S107（既定7） | 引数の多い関数。オブジェクト1つで受ける。Biome の既定（4）のまま |

- **引っかかったとき・`biome-ignore` で抑えるとき** — コードを書く側の決まりなので、[アーキテクチャルール](architecture.md)「1ファイル1責務」が正
- **既存の違反** — いまは無い。上限を超える既存のコードが増えたら、一覧を[既知の問題](../../architecture/known-issues.md)に置き、`biome-ignore` との食い違いを止める検査（前のリポジトリの `check-suppressions.mjs`）を持ち込むかを決める

## overrides で外しているもの

| 対象 | 外したルール | 理由 |
|---|---|---|
| テスト（`*.test.ts(x)`・`apps/web/src/test/**`・`apps/web/e2e/**`） | `style/noNonNullAssertion` | 見つけた要素の祖先（`closest` など）に `!` を付けて辿るのが定石で、見つからなければテストが落ちる |
| テスト（同上） | `complexity/noExcessiveLinesPerFunction` | `describe` の中に場面ごとの `it` を並べるので、`describe` の関数は長くなるのが自然。テストの読みやすさは場面の分け方で見る |
| `**/*.vue` | `correctness/noUnusedImports`・`noUnusedVariables` | Biome は Vue のテンプレート内での使用を解析できず、安全な自動修正（pre-commit）で必要な import を消してしまう |
| `scripts/**` | `suspicious/noConsole` | Node.js の補助スクリプトで、出力が仕事 |

## テストの書き方

Biome 2.6 の `domains.test` に入ったルールのうち、次の3つを有効のままにし、テストの override（`*.test.ts(x)`・`*.test.mjs`・`apps/web/src/test/**`・`apps/web/e2e/**`）で `error` に上げている。既定の重さ（`useConsistentTestIt` が info、ほかの2つが warning）では違反してもコミットも CI も止まらないため（2026-10-30）。

| ルール | 止めるもの | 直し方 |
|---|---|---|
| `style/useConsistentTestIt` | `it` と `test` の混在。好む関数は既定の `it` | `it` に揃える。Biome は `describe, it, test` を両方 import していると自動修正しない |
| `suspicious/useExpect` | 本文に `expect`・`assert.*` が無いテスト | 補助関数の中の `assert.*` は数えない（名前を `assert*` にしても同じ）。補助関数は値や関数を返すだけにし、`assert.*` をテストの本文に書く。`biome-ignore` で抑えない |
| `suspicious/noConditionalExpect` | `if` の中のアサーション | 期待を表にして、条件なしで `assert` する |

- **Playwright（`apps/web/e2e/**`）だけ `test`** — Playwright には `it` が無いので、この範囲の `useConsistentTestIt` は `{ "function": "test", "withinDescribe": "test" }` にしている。この override が無いと、pre-commit の `--write` が `test` を `test as it` に書き換える
- **確かめ方** — `--only` を付けると override の options が効かない。`pnpm exec biome lint <対象>` を `--only` なしで流す

## GritQL のプラグイン

Biome の組み込みのルールに無い検査を、GritQL のプラグイン（`scripts/biome/*.grit`。`biome.json` の `overrides[].plugins` でかける範囲を決める）で書く。正は `.grit` のファイルと `biome.json`、理由はここ。

| プラグイン | かける範囲 | 止めるもの | 理由 |
|---|---|---|---|
| （いまは無い） | | | 前のリポジトリの `no-request-body.grit`（MSW のハンドラが本文を検査せずに使うのを止める）は、MSW のハンドラを作るときに足す（いまは worker までで、ハンドラが無い） |

- **nursery のルールを入れていないこととの違い** — nursery のルールは版の更新で名前や挙動が変わる。プラグインは自分で書いたパターンなので、Biome の版を上げてプラグインの読み込みが壊れれば `pnpm lint` が設定の誤りで止まり、気づける（黙って効かなくなるのではない）
- **確かめ方** — 違反を一時的に入れて `pnpm lint` が止まることを手で確かめる（Biome の設定の固定のテストは書かない。前のリポジトリの進化ログの却下「Biome の設定に対する固定のテスト」）

## 検査の対象から外しているファイル

`files.includes` の `!` で、Biome の検査（lint・整形）から丸ごと外している。外しているのは、ビルドの出力・依存・自動生成のファイルと、Vercel Labs の配布物をそのまま取り込んだ `.claude/skills/react-best-practices`、MSW が `msw init` で作る `apps/web/public/mockServiceWorker.js` だけ。Vitest の HTML レポート（各パッケージの `.vitest/`）は `.gitignore` に書き、`vcs.useIgnoreFile` で外れる（`biome.json` には書かない）。

## 入れていないもの

- **Markdown の整形** — Biome 2.6 から Markdown が lint・整形の対象になった。整形は入れず（`biome.json` の `markdown.formatter.enabled` を `false`。docs の文章を機械で整形し直す差分が大量に出るため。入れるときは別の要望）、lint だけかかる。docs だけのコミットにも pre-commit の lint と安全な自動修正がかかる
- **重複コード（コピー＆ペースト）の検出** — SonarJS の「重複」の指標にあたるものは Biome に無い。入れるかは[進化ログの候補](../evolution.md#候補未評価)
- **意味まで見る SonarJS のルール**（同じ条件の分岐 `no-identical-conditions`、常に同じ値を返す関数など） — Biome に対応が無い。SonarJS 自体を使うには ESLint を併走させることになり、道具が2つになるので入れていない
- **`nursery/noExcessiveNestedCallbacks`** — nursery（試験中）のルールは版の更新で名前や挙動が変わり、`biome.json` が読めなくなることがある。推奨ルールの群に上がったら入れる
- **React の書き方のうち誤検知が多いもの・既存の違反があるもの**（`suspicious/noLeakedRender`・`performance/useTopLevelRegex`） — [アーキテクチャルール](architecture.md)「React の書き方」
