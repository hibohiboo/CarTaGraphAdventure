# Webアプリ（apps/web）の仕組み

[技術スタック](index.md)のモノレポ方針に沿った、React 製フロントエンドの構成をまとめる。

公開先：`https://hibohiboo.github.io/CarTaGraphAdventure/app/`（この docs サイトと同じ GitHub Pages の `app/` 配下）
テストレポート（E2E・Vitest）：[テストレポート](test-report.md)の一覧から開く（main への push ごとに更新）
API ドキュメント：`https://hibohiboo.github.io/CarTaGraphAdventure/api-docs/`（Redoc。OpenAPI の文書は同じ場所の `openapi.json`。main への push ごとに更新。下の「API ドキュメント」）

## 位置づけ

- **バックエンドはまだ作らない。** シナリオはリポジトリの JSON を静的に読み込む。API は、ローカルの開発サーバーの口（`apps/web/vite/` の Hono のアプリを Vite プラグインでつなぐ。提案を要望のファイルに書く）だけ。下の「提案の口」
- **MSW は使わない。** 最初の API を開発サーバーの口で受けるので、偽のサーバーが要らない。画面のテストは、送る関数（`entities/proposal/api/postProposal.ts`）を差し替える（[ロードマップのデザイナーノート](../notes/roadmap.md)）

## 提案の口

GM への提案（[遊びの共通の形](../cartagraph/index.md#提案)）を、要望のファイル（`docs/backlog/proposal-<日時>.md`）に書く。`POST /api/proposals`（本文と応答は[API ドキュメント](#api-ドキュメント)）。

- **口** — `apps/web/vite/proposalApp.ts`（Hono のアプリ）。`apps/web/vite/proposals.ts`（Vite プラグイン）が、開発サーバーの `/api/` で始まる URL だけをそのアプリに渡す。アプリは `server.ssrLoadModule` で読む（Vite の変換を通すので、`@cartagraph/domain`・`@cartagraph/schemas` の TS を import できる）。preview・build には口が無い
- **ファイル** — `apps/web/vite/proposalFile.ts` が作る。frontmatter に `proposal:`（シナリオ・シーン・ビート）、本文にプレイヤーの文（コードブロックの中だけ。VitePress が式・HTML・リンクとして読まないため）と、そこまでのイベントの列。書き方は[要望の書き方](../backlog/index.md)。コミットは自動でしない
- **提案待ちの一覧** — 同じプラグインの仮想モジュール `virtual:proposals` が、書く先のディレクトリの要望のうち、`proposal:` があって状態が「完了」「見送り」でないものを、ビルド時（開発サーバーではページを開くたび）に読む。公開版のビルドでも同じなので、公開版でも提案待ちの止めが効く。`docs/backlog/` の変更は見張らない（口が書いたファイルでページが読み直され、遊んだことが消えないように）。要望の状態を直したら、ページを開き直す
- **読む先の切り替え** — Vitest と、環境変数 `PROPOSALS_BACKLOG=none` のビルド（`playwright.config.ts` の `webServer.env`。E2E）は、空の一覧を読む。コミットした未完了の提案や手元の未追跡の要望で、テストの結果が変わらないようにするため
- **受け付けの検査** — 順に、(1) 送り元がループバック（`127.0.0.0/8`・`::1`）かプライベートの IPv4（`10/8`・`172.16/12`・`192.168/16`）でなければ 403、(2) `Origin` があって `Host` と違えば（`null`・読めない値・`Host` が無いときも）403、(3) 本文が 1 MB を超えれば 422、(4) 本文の形・提案の文・イベントの列・シナリオの id が合わなければ 422、(5) 書けなければ 500
- **残るリスク** — 開発サーバーは `host: '0.0.0.0'` なので、同じ網にいる誰でも、`Origin` を付けずに（ブラウザ以外から）件数の上限なく要望のファイルを作れる。公衆 Wi-Fi では開発サーバーを起動しない。スマホからは IP アドレスで開く（名前の Host は Vite が 403 にする）。IPv6 の ULA・リンクローカルは受け付けない

## ディレクトリ

コードのディレクトリ構成と依存の向きは、[アーキテクチャルール](../process/rules/architecture.md)の「構造」「依存の向き」が正。

- `scripts/copy-web-to-pages.mjs` … ビルド成果物を docs の dist 配下 `app/` へコピー
- `scripts/copy-test-reports-to-pages.mjs` … Playwright・Vitest の HTML レポートを docs の dist 配下へコピー
- `scripts/build-usecase-report.mjs` … E2E の結果（`apps/web/e2e-results/results.json`）と use-cases.md の表から、ユースケースごとの結果のページを作る
- `scripts/build-trace-report.mjs` … 要望（`docs/backlog/` の `trace`）・ユースケースの表・画面・ルールの節・集約・イベントとテストの結果から、トレースのページを作る
- `scripts/build-api-docs.ts` … API ドキュメント（OpenAPI の文書と Redoc の HTML）を docs の dist 配下 `api-docs/` に作る（下の「API ドキュメント」）

## コマンド

```sh
pnpm web:dev         # http://localhost:5173 。人間が手で起動する用
pnpm web:dev:agent   # http://localhost:5174 。エージェントがブラウザで確かめる用
pnpm web:test        # Vitest（全ルートの描画）
pnpm web:e2e         # Playwright（Chromium）
pnpm build:pages     # docs + app + API ドキュメントを docs/.vitepress/dist にまとめてビルド（デプロイと同じ）
pnpm api:docs        # API ドキュメントを docs/.vitepress/dist/api-docs/ に作る（docs:build の後に流す。下記）
```

## デザインシステム

画面の見た目の決まり。トークンの値の正は `apps/web/src/app/styles/tokens.css`（ここには役割だけを書く）。全画面の地は同じ場所の `global.css`（`main.tsx` で読む）、画面ごとの見た目は各スライスの `*.module.css`。前のリポジトリ（CarTaGraphFantasy）の見た目を持ち込んだ（`docs/plans/2026-10-31-P4-試験の最初のシーン.md` D11）。

- **地と紙** — 卓上のフェルト（`--felt` 系）の上に、生成り紙（`--card`・文字は `--ink`）のカードや紙面を置く。卓上の文字は `--parchment-text`
- **アクセント** — 金糸（`--thread`）は飾り線・置き場の枠、朱（`--seal`）は確かめる操作と断る理由、`--focus` はフォーカスと選んでいるカードの枠
- **文字** — 見出し・カード名・シーンの文は明朝（`--font-serif`）、UI はゴシック（`--font-sans`）。Web フォントは読み込まず、OS の書体に任せる（オフラインと E2E の `networkidle` に響かないため）
- **カード** — ゲームの中のカード1枚は縦横比 5:7（`--card-ratio`）。提案のカードは点線の枠（仕様の「提案も、見た目は手札と同じカードにする」）
- **会話の画面** — 上にそのビートに出る NPC の縦長のカード（手札と同じ 5:7。絵・名前・肩書・ひとこと。直近に話した人のカードだけ `--focus` の枠で光り、ほかは薄くなる）、真ん中に会話エリア（`role="log"`。残りの高さを占めて新しい台詞へ自動でスクロールする）、下に自分のカードと手札。吹き出しは NPC が左（`--card`）、自分が右（`--seal`）。自分のカードも同じ縦長で、名前だけ（手札の下の中央）。NPC の絵は丸い枠（`--thread` の線）
- **動き** — `animation`・`transition` は `@media (prefers-reduced-motion: no-preference)` の中にだけ書く（動きを減らす設定の人には出さない。`!important` で一律に消すと Biome の `noImportantStyles` に当たるため）

## API ドキュメント

`packages/schemas` の API の一覧から OpenAPI 3.1 の文書を作り、Redoc の HTML 1枚にして `/api-docs/` に公開する（サイドバーの「開発」から開く）。

- **作る** — `pnpm api:docs`（`scripts/build-api-docs.ts`）。文書の組み立ては `packages/schemas/src/api/openapi.ts`（zod 4 の `z.toJSONSchema`。名前の付いた型は `components.schemas` に1回だけ出す）。`docs/.vitepress/dist/api-docs/` に `openapi.json` と `index.html` を書く。dist は `pnpm docs:build` が作り直すので、その後に流す
- **検査** — `redocly lint` を通してから HTML にする。設定はルートの `redocly.yaml`：警告も誤りにする `recommended-strict` を基に、`security-defined`（認証はまだ無い）・`info-license`（公開の API ではない）・`operation-4xx-response`（失敗を返さない API がある）だけを止めた。CI（`ci.yml`）・pre-push・デプロイ（`build:pages`）で流れ、誤りが1件でもあれば止まる
- **一覧** — いまの API は、提案を要望のファイルに書く開発サーバーの口（`POST /proposals`）だけ。サーバーのパスは `/api`（一覧のパスには付けない）
- **手元で見る** — `pnpm docs:build && pnpm api:docs && pnpm docs:preview --port 4175 --strictPort` で `http://localhost:4175/CarTaGraphAdventure/api-docs/`（4173 は E2E、4174 はエージェントの vite の preview が使う。4175 番の vitepress preview も `pnpm web:dev:agent:stop` で止まる）。`pnpm docs:dev` には無い（サイドバーのリンクは 404 になる）
- **外部への依存** — Redoc の本体は `cdn.redocly.com` から読む（`@redocly/cli` の `build-docs` は同梱できないため）。Google Fonts は読まない（`@redocly/cli` 2.72 から既定で読まない。`--disableGoogleFont` は無くなり、指定すると失敗する）。`@redocly/cli` のテレメトリと更新の確認は、スクリプトが環境変数で止める

## ローカル開発の注意（つまずきやすい点）

- **Git Bash で `WEB_BASE` を渡すとき** — `WEB_BASE=/CarTaGraphAdventure/app/ pnpm web:build` のように環境変数でパスを渡すと、Windows の Git Bash（MSYS2）がパス文字列をWindows形式に変換してしまい壊れる。ローカルで確認する場合は `MSYS_NO_PATHCONV=1 WEB_BASE=/CarTaGraphAdventure/app/ pnpm web:build` のように付ける。GitHub Actions（Ubuntu）では不要（`.github/workflows/deploy.yml` 参照）。
- **開発サーバーは決まったポートでだけ起動する** — `vite.config.ts` の `server.strictPort: true` で、ポートが埋まっていると起動は失敗する（別のポートで黙って起動しない）。人間が手で起動する `pnpm web:dev` は 5173 番、エージェントがブラウザで確かめるときの `pnpm web:dev:agent` は 5174 番に分けている。失敗したら、別の作業ツリー・ブランチの開発サーバーが同じポートで動いていないか確かめ、止めてから起動する
- **エージェントがブラウザで確かめるときの起動と後始末** — `pnpm -w web:dev:agent` をバックグラウンドで起動する（`-w` を付けると、作業ディレクトリが `apps/web` などでもリポジトリ直下のスクリプトを呼べる）。build を preview で確かめるときは `--port 4174 --strictPort` で起動する（E2E の 4173 番と分け、下の停止のスクリプトで止められるように）。終わったら（タスクが時間切れで止まったときも）`pnpm web:dev:agent:stop` で止める。Windows では、起動したタスクを止めても vite の子プロセスが残ってポートを使い続け、次の起動が strictPort で失敗する。停止のスクリプトは、5174 番を待ち受けるのが `vite --port 5174`、4174 番が vite preview、4175 番が vitepress preview（docs と API ドキュメントの確かめ）のときだけ止め、ほかのプロセスには触らない
- **測る前に、そのページが本当に返っているかを確かめる** — ブラウザで誤りの数や表示を測るときは、先に状態コードとページのタイトル（または決まった見出し）を確かめる。`vitepress preview` は起動した後に dist に足したディレクトリを把握せず 404 のページを返す。dist を作り直したら preview を起動し直す
