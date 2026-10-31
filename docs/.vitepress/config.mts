import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';
import { githubSlug } from './slug';

// ```mermaid のコードブロックを図として描く（画面の導線図など。docs/screens/index.md）
export default withMermaid(
  defineConfig({
    base: '/CarTaGraphAdventure/',
    title: 'カルタグラフ・アドベンチャー',
    description: '遊びながら出した提案で育っていくカードTRPGの設計ドキュメント',
    lang: 'ja-JP',
    // docs/plans/ は作業単位のプランドキュメント（コードのパス等を多く含む）で、公開サイトには載せない
    srcExclude: ['plans/**'],
    markdown: { anchor: { slugify: githubSlug } },
    // docs:dev で mermaid を事前バンドルさせる。しないと mermaid の ESM が CommonJS の依存（dayjs・fastdom など）を
    // そのまま import し、ブラウザで「default が無い」と落ちる。withMermaid が足す "dayjs" などの指定は、pnpm では
    // 直下から解決できず黙って飛ばされるので効かない（build は Rollup が変換するので落ちない）
    vite: { optimizeDeps: { include: ['mermaid'] } },

    themeConfig: {
      nav: [
        { text: 'ホーム', link: '/' },
        // ゲームの仕様の入口は1つにする。各ページへは左メニューから辿る
        { text: 'ドキュメント', link: '/concept/', activeMatch: '^/(concept|cartagraph)/' },
        { text: '用語集', link: '/glossary' },
        { text: '未解決論点', link: '/open-questions' },
        { text: 'アプリ', link: '/app/', target: '_self' },
      ],

      // 左メニューは読み手ごとに4つに分ける。まず実現したいこと（ゲームの仕様）、
      // その進み具合、作り方（開発）、資料の順。
      // ページを足したら、ここにも足す（仕様のページがメニューから辿れなくならないように）
      sidebar: [
        {
          text: 'ゲームの仕様',
          items: [
            { text: 'コンセプト', link: '/concept/' },
            { text: '用語集', link: '/glossary' },
            { text: '未解決論点トラッカー', link: '/open-questions' },
          ],
        },
        {
          text: '進み具合',
          items: [
            { text: 'ダッシュボード', link: '/' },
            { text: 'ロードマップ', link: '/roadmap' },
            { text: '要望（バックログ）', link: '/backlog/' },
            { text: '画面一覧と導線', link: '/screens/' },
            { text: '画面ごとの課題', link: '/screens/issues' },
          ],
        },
        {
          text: '開発',
          items: [
            { text: '開発サイクルと体制の進化', link: '/process/' },
            {
              text: 'ルール',
              collapsed: false,
              items: [
                { text: 'アーキテクチャ（構成と依存の向き）', link: '/process/rules/architecture' },
                { text: 'テスト', link: '/process/rules/testing' },
                { text: 'レビュー', link: '/process/rules/review' },
                { text: '静的解析', link: '/process/rules/static-analysis' },
                { text: '仕様のページの書き方', link: '/process/rules/spec-writing' },
                { text: 'docs の1ファイル1責務', link: '/process/rules/doc-responsibility' },
              ],
            },
            {
              text: '技術とアプリの仕組み',
              collapsed: false,
              items: [
                { text: '技術スタック', link: '/architecture/' },
                { text: 'Webアプリの仕組み', link: '/architecture/web-app' },
                { text: '業務領域の分類', link: '/architecture/domain-map' },
                { text: '境界づけられたコンテキスト', link: '/architecture/bounded-contexts' },
                { text: '集約とドメインイベント', link: '/architecture/aggregates' },
                { text: '中核のユースケース', link: '/architecture/use-cases' },
                { text: 'イベントの流れ', link: '/architecture/event-flows' },
                { text: '実装パターン', link: '/architecture/implementation-patterns' },
              ],
            },
            { text: '既知の問題', link: '/architecture/known-issues' },
            { text: '人間が手で行う操作（git・PR）', link: '/process/manual-operations' },
            { text: '依頼文サンプル', link: '/process/prompt-sample' },
            { text: '体制の進化ログ', link: '/process/evolution' },
            { text: '体制の進化のタイムライン', link: '/process/timeline' },
            { text: 'テストレポート', link: '/architecture/test-report' },
            { text: 'ルールのテストの対象外', link: '/architecture/rule-test-exclusions' },
            // Redoc の HTML 1枚（pnpm api:docs が dist に作る。docs:dev には無い。docs/architecture/web-app.md「API ドキュメント」）
            { text: 'API ドキュメント', link: '/api-docs/', target: '_self' },
          ],
        },
        {
          text: '資料',
          items: [
            // アプリは VitePress 管理外の静的ファイルなので SPA 遷移を避ける
            { text: 'アプリを開く', link: '/app/', target: '_self' },
            {
              // 仕様・定義のページに1対1で対応する。決めた理由・経緯・将来の拡張候補を置く
              text: 'デザイナーノート',
              link: '/notes/',
              collapsed: true,
              items: [
                { text: '遊びの共通の形', link: '/notes/cartagraph' },
                { text: 'ロードマップ', link: '/notes/roadmap' },
              ],
            },
          ],
        },
      ],

      outline: {
        level: [2, 3],
      },

      socialLinks: [
        {
          icon: 'github',
          link: 'https://github.com/hibohiboo/CarTaGraphAdventure',
        },
      ],
    },
  }),
);
