---
paths:
  - "docs/cartagraph/**"
  - "docs/concept/**"
  - "docs/glossary.md"
---

# 仕様のページの書き方

対象：正式仕様のページ（`docs/cartagraph/`・`docs/concept/`・`docs/glossary.md`）。仕様のページを書く・直すときの決まりを、ここに集める。ノートそのものの書き方は[デザイナーノート](../../notes/index.md)が正。

## いまのルールだけを書く

- 仕様のページには「いまのルール」だけを端的に書く（docs 全体に通じる線引きは[docs の1ファイル1責務](doc-responsibility.md)が正）。そう決めた理由・決まるまでの経緯・採らなかった案・将来の拡張候補は、対応する[デザイナーノート](../../notes/index.md)に書く（ゲームの仕様 `docs/cartagraph/` のページは、ノートと1対1）
- 仕様を変えたら、理由をノートに足す。仕様のページの末尾から、対応するノートへ1行でリンクする
- ノートに仕様を書き写さない（食い違いの元になる）。仕様の正は仕様のページ

## 決まっていないこと

- 決めるまで実装もしないものは、仕様のページに書かず[未解決論点](../../open-questions.md)に置く
- 決着を待たずに仮のルールを置きたくなったら、仮ルールの仕組み（前のリポジトリの `docs/provisional/` と `check-provisional.mjs`）を持ち込むかを先に決める（[体制の進化ログ](../evolution/2026-10.md)）

## 実装を指さない

- 仕様のページから実装のファイル（`apps/`・`packages/`・`scripts/` のパス）を指さない（機械では止めていない。レビューで見る）。値や定義の出どころを実装に置くと、実装を直したときに仕様が黙って変わる。実装との対応は [Webアプリの仕組み](../../architecture/web-app.md) などの `docs/architecture/` に書く

## 機械で止めること

`pnpm docs:build` の最後に流れる（pre-push・CI でも止まる）。

- 用語の旧称（`scripts/check-terms.mjs`。用語の正は[用語集](../../glossary.md)）
- 見出し（`##`・`###`）の書式（空白・`( )` など。`scripts/rule-sections.mjs`）。見出しを直す・消すと、その節のタグを付けた `packages/domain` などのテストが `pnpm domain:test` で落ちる。直し方は[テストのルール](testing.md)の「ルールのテストのタグ」
