---
name: dev-process-structure
description: 開発プロセスの置き場所（docs/process がSSOT、AGENTS.md が入口、.claude は呼び出し口）と、フル／ライトの2ルート運用。CarTaGraphFantasy から持ち込んだ
metadata:
  type: project
---

2026-10-30、CarTaGraphFantasy の開発プロセスをそのまま持ち込んだ（何を持ち込み何を置いていったかは `docs/plans/2026-10-30-P1-骨の持ち込み.md` と `docs/process/evolution/2026-10.md`）。

- **正（SSOT）は `docs/process/`**：`index.md`（開発サイクル8ステップ＋体制の進化）、`rules/`、`prompt-sample.md`（依頼文雛形）、`evolution.md`（候補→採用／却下のログ。月ごとのページは `evolution/<年-月>.md`）
- **入口は `AGENTS.md`**。`CLAUDE.md` は `@AGENTS.md` で読み込むだけ
- **`.claude/` は薄い層**：中身と決まりの正は CLAUDE.md「Claude Code 固有の補足」。`.claude/rules/` は `scripts/sync-claude-rules.mjs` が作る
- プランは `docs/plans/<日付>-P<id>-<機能>.md`。id はブランチと共通の連番（`scripts/branch-id.mjs`。P1 から始め直した）

**How to apply:** `apps/`・`packages/` の振る舞いを変える依頼はフルルート（`/dev-cycle`：プランから）。docs のみ・試作・小修正はライトルートで、id 付きのブランチでコミットし main へ早送りで取り込んで push する（push は [[push-then-report]] の通り確認不要）。プロセスに不満・不足を感じたら `docs/process/evolution.md` の候補に追記し、採用はユーザーが決める。運用知識をメモリにだけ残さず docs に書く。
