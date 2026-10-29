---
name: push-then-report
description: mainへのpushは確認を挟まず実行し、push後のデプロイ結果確認（gh run watch等）はユーザー側で行うので不要
metadata:
  type: feedback
---

作業内容を main へ push する際、事前に確認を取らずそのまま push してよい。**push 後のデプロイ結果確認（`gh run watch` などで GitHub Actions の完了を待つこと）はユーザー自身が行うので、AI 側でやる必要はない。** push したらそのまま URL を伝えて完了報告すればよい。

**Why:** CarTaGraphFantasy で、ユーザーから「pushしたところで教えてもらえば大丈夫」「デプロイ結果確認もこちらでやるので、AIはデプロイ結果の確認は不要」と言われた。仕組みを持ち込んだこのリポジトリでも同じ運用にする（2026-10-30）。

main へは直接コミットできない（pre-commit が止める）。ライトの変更は id 付きのブランチでコミットし、main で `git merge --ff-only` してから push する。その push も確認不要。

**How to apply:** 破壊的な操作（force push、PR のクローズなど）や、公開範囲・影響が大きい変更は別途判断する。通常のドキュメント修正などは、push した時点で変更内容と URL を報告して完了とする。[[dev-process-structure]]
