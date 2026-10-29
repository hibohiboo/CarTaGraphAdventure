# Webアプリ（apps/web）の仕組み

[技術スタック](index.md)のモノレポ方針に沿った、React 製フロントエンドの構成をまとめる。

公開先：`https://hibohiboo.github.io/CarTaGraphAdventure/app/`（この docs サイトと同じ GitHub Pages の `app/` 配下）
テストレポート（E2E・Vitest）：[テストレポート](test-report.md)の一覧から開く（main への push ごとに更新）
API ドキュメント：`https://hibohiboo.github.io/CarTaGraphAdventure/api-docs/`（Redoc。OpenAPI の文書は同じ場所の `openapi.json`。main への push ごとに更新。下の「API ドキュメント」）

## 位置づけ

- **バックエンドはまだ作らない。** シナリオはリポジトリの JSON を静的に読み込む。書き込みは、ローカルの開発サーバーの口（提案を要望のファイルに書く。playable-scene で作る）だけ
- MSW は、依存と worker（`apps/web/public/mockServiceWorker.js`。`msw init` が作る。検査の対象外）まで持ち込んだ。ハンドラ（`@/mocks`）と `main.tsx` での起動は、画面から API を叩くようになったら足す（[ロードマップのデザイナーノート](../notes/roadmap.md)）

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

## API ドキュメント

`packages/schemas` の API の一覧から OpenAPI 3.1 の文書を作り、Redoc の HTML 1枚にして `/api-docs/` に公開する（サイドバーの「開発」から開く）。

- **作る** — `pnpm api:docs`（`scripts/build-api-docs.ts`）。文書の組み立ては `packages/schemas/src/api/openapi.ts`（zod 4 の `z.toJSONSchema`。名前の付いた型は `components.schemas` に1回だけ出す）。`docs/.vitepress/dist/api-docs/` に `openapi.json` と `index.html` を書く。dist は `pnpm docs:build` が作り直すので、その後に流す
- **検査** — `redocly lint` を通してから HTML にする。設定はルートの `redocly.yaml`：警告も誤りにする `recommended-strict` を基に、`security-defined`（認証はまだ無い）・`info-license`（公開の API ではない）・`operation-4xx-response`（失敗を返さない API がある）だけを止めた。CI（`ci.yml`）・pre-push・デプロイ（`build:pages`）で流れ、誤りが1件でもあれば止まる
- **一覧が空のうち** — 最初の API は、提案を要望のファイルに書く開発サーバーの口（`docs/plans/2026-10-30-P1-骨の持ち込み.md` D10）
- **手元で見る** — `pnpm docs:build && pnpm api:docs && pnpm docs:preview --port 4175 --strictPort` で `http://localhost:4175/CarTaGraphAdventure/api-docs/`（4173 は E2E、4174 はエージェントの vite の preview が使う。4175 番の vitepress preview も `pnpm web:dev:agent:stop` で止まる）。`pnpm docs:dev` には無い（サイドバーのリンクは 404 になる）
- **外部への依存** — Redoc の本体は `cdn.redocly.com` から読む（`@redocly/cli` の `build-docs` は同梱できないため）。Google Fonts は読まない（`@redocly/cli` 2.72 から既定で読まない。`--disableGoogleFont` は無くなり、指定すると失敗する）。`@redocly/cli` のテレメトリと更新の確認は、スクリプトが環境変数で止める

## ローカル開発の注意（つまずきやすい点）

- **Git Bash で `WEB_BASE` を渡すとき** — `WEB_BASE=/CarTaGraphAdventure/app/ pnpm web:build` のように環境変数でパスを渡すと、Windows の Git Bash（MSYS2）がパス文字列をWindows形式に変換してしまい壊れる。ローカルで確認する場合は `MSYS_NO_PATHCONV=1 WEB_BASE=/CarTaGraphAdventure/app/ pnpm web:build` のように付ける。GitHub Actions（Ubuntu）では不要（`.github/workflows/deploy.yml` 参照）。
- **開発サーバーは決まったポートでだけ起動する** — `vite.config.ts` の `server.strictPort: true` で、ポートが埋まっていると起動は失敗する（別のポートで黙って起動しない）。人間が手で起動する `pnpm web:dev` は 5173 番、エージェントがブラウザで確かめるときの `pnpm web:dev:agent` は 5174 番に分けている。失敗したら、別の作業ツリー・ブランチの開発サーバーが同じポートで動いていないか確かめ、止めてから起動する
- **エージェントがブラウザで確かめるときの起動と後始末** — `pnpm -w web:dev:agent` をバックグラウンドで起動する（`-w` を付けると、作業ディレクトリが `apps/web` などでもリポジトリ直下のスクリプトを呼べる）。build を preview で確かめるときは `--port 4174 --strictPort` で起動する（E2E の 4173 番と分け、下の停止のスクリプトで止められるように）。終わったら（タスクが時間切れで止まったときも）`pnpm web:dev:agent:stop` で止める。Windows では、起動したタスクを止めても vite の子プロセスが残ってポートを使い続け、次の起動が strictPort で失敗する。停止のスクリプトは、5174 番を待ち受けるのが `vite --port 5174`、4174 番が vite preview、4175 番が vitepress preview（docs と API ドキュメントの確かめ）のときだけ止め、ほかのプロセスには触らない
- **測る前に、そのページが本当に返っているかを確かめる** — ブラウザで誤りの数や表示を測るときは、先に状態コードとページのタイトル（または決まった見出し）を確かめる。`vitepress preview` は起動した後に dist に足したディレクトリを把握せず 404 のページを返す。dist を作り直したら preview を起動し直す
