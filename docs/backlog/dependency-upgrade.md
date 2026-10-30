---
title: 依存の版を上げる
status: 完了
summary: 前のリポジトリの lockfile のまま止めている依存を、メジャーの更新も含めて新しい版に上げる。Biome 2.6 の新しいテストの lint のルールは入れ、Markdown の整形は入れない。
plans:
  - 2026-10-30-P3-依存の版を上げる.md
cycles:
  - { name: P3 依存の版を上げる, status: 完了, pr: 1 }
trace:
  none: 開発の基盤で、つなぐユースケース・画面・ルールの節が無い
updated: 2026-10-31
---

# 依存の版を上げる

骨の持ち込み（[プラン](https://github.com/hibohiboo/CarTaGraphAdventure/blob/main/docs/plans/2026-10-30-P1-%E9%AA%A8%E3%81%AE%E6%8C%81%E3%81%A1%E8%BE%BC%E3%81%BF.md)の R2）では、前のリポジトリの `pnpm-lock.yaml` を持ち込み、動くとわかっている版で始めた。lockfile 無しで入れたときに出た差は次のとおり。

- **Biome 2.6.3** — Markdown を整形するようになり、docs と `.claude/skills/` のほぼ全部の Markdown が整形の指摘になった。テストの書き方の新しいルール（`useConsistentTestIt` 32件・`useExpect` 16件・`noConditionalExpect` 1件）が `scripts/*.test.mjs` に当たった
- **@redocly/cli 2.72** — `build-docs` の `--disableGoogleFont` が無くなった（既定で Google Fonts を読まない）。`scripts/build-api-docs.ts` から外す

2026-10-30 に人間が決めたこと：範囲はメジャーを含めて全部最新（mermaid は `vitepress-plugin-mermaid` が 12 を許していないので 11 に留める）、Markdown の整形は入れない、テストの lint の新しいルールは入れて既存のテストを直す。MSW は依存と worker まで持ち込む（ハンドラと起動は画面から API を叩く最初の要望で作る）。テストの lint の3ルールは error に上げる。ほかのメジャーの更新で壊れる箇所と直し方は[プラン](https://github.com/hibohiboo/CarTaGraphAdventure/blob/main/docs/plans/2026-10-30-P3-%E4%BE%9D%E5%AD%98%E3%81%AE%E7%89%88%E3%82%92%E4%B8%8A%E3%81%92%E3%82%8B.md)。
