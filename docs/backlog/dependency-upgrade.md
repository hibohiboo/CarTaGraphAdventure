---
title: 依存の版を上げる
status: 未着手
summary: 前のリポジトリの lockfile のまま止めている依存（Biome・@redocly/cli など）を新しい版に上げ、新しい lint のルールと Markdown の整形を入れるかを決める。
decisions:
  - Biome 2.6 の Markdown の整形と、新しいテストの lint のルール（useConsistentTestIt・useExpect・noConditionalExpect）を入れるか
trace:
  none: 開発の基盤で、つなぐユースケース・画面・ルールの節が無い
updated: 2026-10-30
---

# 依存の版を上げる

骨の持ち込み（[プラン](https://github.com/hibohiboo/CarTaGraphAdventure/blob/main/docs/plans/2026-10-30-P1-%E9%AA%A8%E3%81%AE%E6%8C%81%E3%81%A1%E8%BE%BC%E3%81%BF.md)の R2）では、前のリポジトリの `pnpm-lock.yaml` を持ち込み、動くとわかっている版で始めた。lockfile 無しで入れたときに出た差は次のとおり。

- **Biome 2.6.3** — Markdown を整形するようになり、docs と `.claude/skills/` のほぼ全部の Markdown が整形の指摘になった。テストの書き方の新しいルール（`useConsistentTestIt` 32件・`useExpect` 16件・`noConditionalExpect` 1件）が `scripts/*.test.mjs` に当たった
- **@redocly/cli 2.72** — `build-docs` の `--disableGoogleFont` が無くなった（既定で Google Fonts を読まない）。`scripts/build-api-docs.ts` から外す
