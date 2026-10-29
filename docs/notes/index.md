---
paths:
  - "docs/notes/**"
---

# デザイナーノート

[ゲームの仕様](../cartagraph/index.md)の各ページに1対1で対応する、設計の舞台裏のページ（ゲームの仕様以外のページの経緯も置ける。下の「ゲームの仕様以外のノート」）。次のものを置く。

- そう決めた理由・動機
- 決まるまでの経緯（grilling でどう整理したか、など）
- 検討して採らなかった案
- 将来の拡張候補

ここは**正式仕様ではない**。仕様の正は対応する仕様のページ。仕様のページとの書き分け（仕様を変えたら理由をここに足す、仕様を書き写さない、など）は[仕様のページの書き方](../process/rules/spec-writing.md)が正。

ファイル名は仕様のページと同じにする（`docs/cartagraph/unlock.md` のノートは `docs/notes/unlock.md`）。

## ゲームの仕様以外のノート

`architecture/` など、ゲームの仕様以外の定義のページから移す経緯も、ここに置く（[docs の1ファイル1責務](../process/rules/doc-responsibility.md)）。ノートは移すものがあるページにだけ作り、空のノートは作らない。

- `docs/architecture/<名前>.md` のノート → `docs/notes/architecture/<同じ名前>.md`
- `docs/concept/`・`docs/screens/` のノートも同じく、ディレクトリを保つ（`docs/concept/index.md` のノートは `docs/notes/concept/index.md`）
- `docs/cartagraph/index.md` のノートは、このページ（`notes/index.md`）とぶつかるので `docs/notes/cartagraph.md`
- docs 直下のページのノート → `docs/notes/<同じ名前>.md`（例：`docs/roadmap.md` のノートは `docs/notes/roadmap.md`）
- ゲームの仕様のノートは、今の位置（`docs/notes/<名前>.md`）のまま

## 決着した論点

[未解決論点トラッカー](../open-questions.md)で扱い、決着した論点。いまは無い。

## ノートの一覧

- [ロードマップ](roadmap.md)
