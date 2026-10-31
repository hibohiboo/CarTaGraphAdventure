# CarTaGraphAdventure

遊びながら出した提案で、シナリオと機能が育っていくカードTRPG「カルタグラフ・アドベンチャー」の設計仕様書と、その Web アプリ。
本ファイルはAIコーディングエージェント向けの地図である。Claude Code・Codex・Cursor など、どのエージェント（どのモデル）でも、まずここを読む。
Claude Code は `CLAUDE.md` からこのファイルを読み込む。

## いま作っているもの

プレイヤーとして遊べる土台から作る。どのビート（シーンの中の一区切り）でも、プレイヤーは手札を出すか GM へ提案するかを選び、提案は `docs/backlog/` の要望になる（`docs/cartagraph/index.md`）。進む順は `docs/roadmap.md`。GM・セッション・複数のプレイヤー・シナリオ製作の画面・バックエンドは、要望になるまで作らない（`docs/notes/roadmap.md`「今は作らないもの」）。

## 技術スタック

- TypeScript のみ。pnpm workspace によるモノレポ（Node 24 / pnpm 11）
- `docs/` … VitePress 製の設計仕様書サイト（GitHub Pages で公開）
- `apps/web/` … Vite + React 19 + react-router（Hashルーター）
  - **バックエンドは未実装。** MSW は依存と worker（`public/mockServiceWorker.js`）まで。ハンドラ（`@/mocks`）と起動は、画面から API を叩く最初の要望で作る
- `packages/domain/` … ドメイン。`docs/` の用語をそのまま型に落としたもの
- `packages/schemas/` … API の一覧（本文と応答の形・状態コード）とリクエストの本文のスキーマ（zod）。ここから OpenAPI の文書（API ドキュメント）を作る
- テスト … Vitest（`apps/web/src/test/`、`packages/domain/src/**/*.test.ts`、`packages/schemas/src/**/*.test.ts`）。E2E は Playwright（`apps/web/e2e/`）

## ディレクトリ構成

- `docs/concept/`, `docs/cartagraph/`, `docs/architecture/`, `docs/glossary.md`, `docs/open-questions.md` … 正式仕様（SSOT）
- `docs/notes/` … デザイナーノート。ゲームの仕様のページと1対1（ゲームの仕様以外のページの経緯も置ける）で、決めた理由・経緯・将来の拡張候補を置く。正式仕様ではない（仕様のページとの書き分けは `docs/process/rules/spec-writing.md`、docs 全体の1ページ1責務は `docs/process/rules/doc-responsibility.md`）
- `docs/process/` … 開発プロセス（開発サイクル・ルール・依頼文雛形・体制の進化ログ）。**正式仕様の一部**
- `docs/plans/` … プランドキュメント（作業単位の設計書。VitePress のビルド対象外）
- `docs/backlog/` … 要望（PBI）を1要望1ファイルで置く。先頭の状態・判断待ちから、トップページのダッシュボードをビルド時に組み立てる（`docs/.vitepress/*.data.ts`）
- `apps/`・`packages/`・`scripts/` … コード。ディレクトリ構成と依存の向きは `docs/process/rules/architecture.md`「構造」「依存の向き」が正（ここには書き写さない）
- `.claude/` … Claude Code 固有の設定。中身と決まりは `CLAUDE.md` に書く（ここには書かない）。手順の本文は `docs/process/` が正

## コマンド

```sh
pnpm web:dev          # http://localhost:5173。人間が手で起動する用
pnpm web:dev:agent    # http://localhost:5174。エージェントがブラウザで確かめる用（人間の開発サーバーと取り合わない）
pnpm web:dev:agent:stop # 上の開発サーバーと、エージェントの preview（4174 番の vite preview、4175 番の docs の vitepress preview）を止める。ほかのプロセスには触らない
pnpm web:e2e          # Playwright（Chromium）。全ルートの描画と、ユースケースの通し（apps/web/e2e/usecases/）。CI で回る
pnpm usecase:report   # 上の結果から、ユースケースごとの結果のページ（apps/web/usecase-report/index.html）を作る。`pnpm web:e2e; pnpm usecase:report` と流す
pnpm web:test         # Vitest（全ページを描画）
pnpm web:typecheck    # tsc
pnpm domain:test      # Vitest（packages/domain の純粋関数）
pnpm domain:typecheck # tsc（packages/domain。テストファイルも含む）
pnpm schemas:test     # Vitest（packages/schemas の API の一覧・本文と応答のスキーマ・OpenAPI の文書）
pnpm schemas:typecheck # tsc（packages/schemas。テストファイルも含む）
pnpm tools:test       # node --test（scripts/ と .claude/hooks/ の補助スクリプト）
pnpm trace:report     # 要望からユースケース・画面・ルールの節・テスト・集約・イベントまでのつながりの図のページ（trace-report/index.html）を作る。`pnpm docs:build; pnpm web:e2e; pnpm test:report; pnpm trace:report` と流す（docs/architecture/test-report.md「トレースの見方」）
pnpm test:report      # 各パッケージの Vitest を HTML・JSON のレポート付きで流す（HTML は各パッケージの .vitest/、JSON は vitest-results/ に書く。デプロイが Pages に載せる。docs/architecture/test-report.md）
pnpm docs:dev         # 仕様書サイトをローカルで確認
pnpm docs:build       # 仕様書サイトのビルド（リンク切れ・見出しへのリンクの食い違い・用語の旧称（scripts/check-terms.mjs）・画面一覧とルート定義の食い違い（scripts/check-screens.mjs）・集約・イベントの流れ・実装パターンの文書どうしのドメインイベントの食い違い（scripts/check-events.mjs）・E2E のテストに付けたユースケースの ID のタグ・ステップと use-cases.md の表の食い違い（scripts/check-usecase-tags.mjs）・要望の trace と UC の表の画面・集約・イベントの列の食い違い（scripts/check-trace.mjs）・文書が指すスクリプト・検査・pnpm のスクリプトが無いこと（scripts/check-doc-refs.mjs）・下の「開発ルールの適用」の表や .claude/rules/ とルールのページの paths の食い違い（scripts/sync-claude-rules.mjs --check）があると失敗する）
pnpm build:pages      # docs + app + API ドキュメントをまとめてビルド（デプロイと同じ）
pnpm api:docs         # API ドキュメント（OpenAPI の文書と Redoc の HTML）を docs/.vitepress/dist/api-docs/ に作る。redocly lint で誤りがあれば失敗する（docs:build の後に流す。docs/architecture/web-app.md「API ドキュメント」）
pnpm lint             # Biome（フォーマット・import整理・lintをまとめてチェック）
pnpm lint:fix         # 同上、安全な修正を自動適用
node scripts/branch-id.mjs new <種類> <名前> [--id P12]  # 次の連番 id で作業ブランチ <種類>/P<id>-<名前> を切る（main にはコミットできない。プランは docs/plans/<日付>-P<id>-<機能>.md）
node scripts/replace-once.mjs <spec.json>  # ファイルの文字列を置き換える。件数（既定1件・count で指定）と二重の当たりを確かめてから書く
node scripts/mutate-check.mjs <spec.json>  # 守る条件を1つずつ外し、テストが落ちることを確かめて元に戻す（testing.md「骨抜き禁止」）
node scripts/sync-claude-rules.mjs          # ルールのページの frontmatter の paths から .claude/rules/ の入口ファイルを作り直す
```

コミット前に最低限 `pnpm web:typecheck && pnpm web:test` を通す。`packages/domain` を触ったら `pnpm domain:typecheck && pnpm domain:test` も通す。`packages/schemas` を触ったら `pnpm schemas:typecheck && pnpm schemas:test` も通す。API の一覧・応答の形（`packages/schemas`・`packages/domain` の model.ts）を触ったら `pnpm docs:build && pnpm api:docs` も通す。`docs/` を触ったら `pnpm docs:build` も通す。`docs/cartagraph/` の見出しを直したら `pnpm domain:test` も通す（その見出しのタグを付けたテストが落ちる。docs/process/rules/testing.md「ルールのテストのタグ」）。`apps/web/e2e/` を触ったら `pnpm docs:build` も通す（ユースケースのタグの検査が走る）。`scripts/`・`.claude/hooks/` を触ったら `pnpm tools:test` も通す。

lint・型検査・テスト・docsビルドは、AI にトークンを使わせず git フックで機械的に止める。
- `.githooks/pre-commit` … main へのコミットと、id の無いブランチでのコミットを止める（作業は `node scripts/branch-id.mjs new` で切った id 付きのブランチで行う。`docs/process/index.md`「適用範囲」）。ステージ済みファイルだけ `biome check --staged --write` を実行し、安全な指摘（フォーマット崩れ等）は自動修正して再ステージする。`--unsafe`が要る指摘（意図的に自動適用しない方針）だけコミットを止める
- `.githooks/commit-msg` … 進め方に関わるファイル（`docs/process/` のルール・`AGENTS.md`・`CLAUDE.md`・`.claude/`。範囲は `scripts/check-evolution-log.mjs`）を変えたのに、体制の進化ログ（`docs/process/evolution.md` か、月ごとのページ `docs/process/evolution/<年-月>.md`）が変わっていないコミットを止める。記録が要らない変更は、コミットメッセージに `進化ログ不要: <理由>` の行を書く。あわせて、ブランチ名の id をメッセージの1行目の末尾に ` #P12` の形で付ける（`scripts/branch-id.mjs`）
- `.githooks/pre-push` … push前に `pnpm web:typecheck && pnpm domain:typecheck && pnpm domain:test && pnpm schemas:typecheck && pnpm schemas:test && pnpm web:test && pnpm tools:test && pnpm docs:build && pnpm api:docs`（CIと同じ）を実行する

`pnpm install` すると `prepare` スクリプトが `git config --local core.hooksPath .githooks` を自動で設定するので、通常は何もしなくてよい。設定されていない場合は手動で同じコマンドを実行する。CI（`.github/workflows/ci.yml`）にも同じチェック（lint・型検査・テスト・docsビルド・API ドキュメントの生成）があり、フック未設定や `--no-verify` の取りこぼしを検出する。

## 開発ルールの適用

ファイルを読む・変更する・レビューするときは、対象パスに一致するルールを先に読む。複数一致した場合はすべて適用する。

対象のパス（`…` で囲んだもの）の正は、各ルールのページの先頭（frontmatter）の `paths`。この表と Claude Code の `.claude/rules/`（そのパスのファイルを開くと自動で読み込まれる入口ファイル）は、それに合わせる。パスを変えるときは frontmatter を直し、`node scripts/sync-claude-rules.mjs` を流してこの表も直す（食い違いは `pnpm docs:build` が止める）。

| 対象 | 必ず読むルール |
|---|---|
| `apps/**`, `packages/**` | `docs/process/rules/architecture.md` |
| `apps/**/*.test.*`, `packages/**/*.test.*`, `apps/web/src/test/**`, `apps/web/vite.config.ts`, `apps/web/vite/**`, `apps/web/e2e/**`, `apps/web/playwright.config.ts`、テストの追加・変更 | `docs/process/rules/testing.md` |
| `biome.json`, `scripts/biome/**`、lint のルール・しきい値を変えるとき | `docs/process/rules/static-analysis.md` |
| push・マージ前、レビュー実行時 | `docs/process/rules/review.md` |
| `docs/plans/**`、機能追加・振る舞いの変更（プラン作成から） | `docs/process/index.md`（開発サイクル） |
| `docs/cartagraph/**`, `docs/concept/**`, `docs/glossary.md` | `docs/process/rules/spec-writing.md`（仕様のページの書き方） |
| `docs/concept/**`, `docs/cartagraph/**`, `docs/architecture/**`, `docs/process/rules/**`, `docs/screens/**`, `docs/roadmap.md`, `docs/backlog/**`, `docs/open-questions.md`, `docs/glossary.md` | `docs/process/rules/doc-responsibility.md`（docs の1ファイル1責務） |
| `docs/notes/**` | `docs/notes/index.md`（デザイナーノートの書き方） |
| `docs/backlog/**` | `docs/backlog/index.md`（要望の書き方） |

## 最重要ルール

1. **ルールと仕様書が矛盾したら止める。** `AGENTS.md`・`docs/process/` に書かれた開発運用ルールと、`docs/` 配下の仕様書の内容が矛盾する場合、推測でどちらかを優先して作業を進めてはいけない。作業を止め、矛盾の内容（どのルールと、どの仕様書のどの記述が食い違っているか）を人間に報告し、判断を仰ぐ。
2. **唯一の信頼できる情報源（SSOT）。** 同じ情報を複数箇所に重複して書かず、常にどこか一箇所を正とする。仕様の正は `docs/` 配下の正式ページ。
3. **重複・分散に気づいたら、その場で直して報告する。** どちらを正にするかが明らかなら（用語の揺れ、古い記述、同じ説明の書き写しなど）、その場で1か所に寄せて直し、直したことを人間に報告する。正が決められないとき（どちらも正式なページで、寄せると仕様の意味が変わる）だけ、作業を止めて人間に判断を仰ぐ。
4. **プランにない変更は実装しない。** 必要になったら立ち止まって報告する（`docs/process/index.md`）。将来やりたいこと（`docs/notes/roadmap.md`「今は作らないもの」）を先回りして作らない。
5. **改行コードは LF**（Windows でも）。
