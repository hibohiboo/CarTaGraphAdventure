import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';
import { vitestTags } from '../../scripts/rule-sections.mjs';
import { proposals } from './vite/proposals.ts';

// GitHub Pages では docs サイト配下の /CarTaGraphAdventure/app/ に置く（scripts/copy-web-to-pages.mjs）。
// ローカル開発では / のまま。
const base = process.env.WEB_BASE ?? '/';

// 提案待ちの一覧は、既定ではリポジトリの docs/backlog/ を読む。Vitest と、環境変数 PROPOSALS_BACKLOG=none の
// ビルド（E2E）では空の一覧を読み、コミットした未完了の提案や手元の未追跡の要望で結果が変わらないようにする
// （docs/process/rules/testing.md「テストの独立性」）。公開版のビルドと開発サーバーは実物を読む
const emptyProposals = Boolean(process.env.VITEST) || process.env.PROPOSALS_BACKLOG === 'none';

export default defineConfig({
  base,
  plugins: [react(), proposals({ backlogDir: emptyProposals ? null : undefined })],
  // FSD の層をまたぐ import は @/<層>/... で書く（docs/process/rules/architecture.md「依存の向き」）。tsconfig の paths と揃える
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // 5173 番が埋まっていたら、別のポートで黙って起動せず失敗させる。別の作業ツリーやブランチで動いている
  // 開発サーバーを、気づかずに確かめてしまわないため
  server: { port: 5173, strictPort: true, host: '0.0.0.0' },
  build: {
    rolldownOptions: {
      output: {
        // ライブラリ本体とアプリ本体を分け、アプリ側の変更でライブラリのキャッシュが無効にならないようにする
        codeSplitting: {
          groups: [{ name: 'react', test: /node_modules[\\/](react|react-dom|react-router)[\\/]/ }],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: false,
    css: false,
    // e2e/ は Playwright 専用（apps/web/playwright.config.ts）。Vitest の既定includeは
    // .test.ts/.spec.ts の両方を拾うため、明示的に除外しないと二重に実行されてしまう
    exclude: [...configDefaults.exclude, '**/e2e/**'],
    // ルールのページの節のタグ（docs/process/rules/testing.md「ルールのテストのタグ」）。見出しに無いタグを付けたテストは落ちる
    tags: vitestTags(),
  },
});
