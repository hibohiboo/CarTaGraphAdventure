# 技術スタック

決めた理由は[ロードマップのデザイナーノート](../notes/roadmap.md)にある。

## 実装言語

TypeScript のみ。

## パッケージマネージャ・モノレポ構成

pnpm workspace（Node 24 / pnpm 11）。

- `docs/` … VitePress 製の設計仕様書サイト（GitHub Pages で公開）
- `apps/web/` … Vite + React 19 + react-router（Hash ルーター）
- `packages/domain/` … ゲームのドメイン（純粋関数）
- `packages/schemas/` … API の一覧（zod）。ここから OpenAPI の文書（API ドキュメント）を作る

ディレクトリ構成と依存の向きの正は[アーキテクチャルール](../process/rules/architecture.md)。

## バックエンド

まだ作らない。シナリオはリポジトリの JSON を静的に読み込み、書き込みはローカルの開発サーバーの口だけにする。

## この章の設計原則

- 使わないうちは仕組みを持ち込まない（MSW・バックエンドは、要るとわかってから足す）
