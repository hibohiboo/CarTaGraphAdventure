---
paths:
  - "apps/**"
  - "packages/**"
---

# アーキテクチャルール（どこに何を置くか）

対象：`apps/**`、`packages/**`。**コードのディレクトリ構成と依存の向きは、ここが正**（README・AGENTS.md・[Webアプリの仕組み](../../architecture/web-app.md)はここを指す）。技術選定の経緯は[技術スタック](../../architecture/index.md)、Webアプリの動き（ルーティング・画面・API ドキュメント）は[Webアプリの仕組み](../../architecture/web-app.md)にある。

## 構造

```text
apps/web/                 Vite + React + react-router
  src/          Feature-Sliced Design（FSD）の層。上から app → pages → widgets → features → entities → shared
    app/        router.tsx（ページを並べる）。app は層の直下にファイルを置いてよい。
                app の中のサブフォルダに TS を置くなら、app の中も @/app/… で import する
    pages/<グループ>/<ページ>/   1ページ1スライス（グループはルートのグループ。
                グループの無いページは pages/<ページ>/）。ui/ にページと、そのページだけで使う部品
    widgets/    複数のページで使う、画面の大きなまとまり（いまは無い）
    features/   利用者の操作と UI が対になったもの（いまは無い。必要になったら作る）
    entities/<エンティティ>/   エンティティの見た目・取得・変更（いまは proposal/api/ の提案を送る関数だけ）
    shared/     ui/（部品）、lib/（整形・変換・画面に依らない小さなフック）、
                routes/（routes.ts：ルート一覧の唯一の情報源）
    main.tsx    エントリ（層の外）
    test/       層の外。Vitest のテスト（docs/process/rules/testing.md）
  vite/         開発サーバーの口（Hono のアプリ proposalApp.ts）と、それをつなぐ Vite プラグイン（proposals.ts）、
                要望ファイルの中身を作る proposalFile.ts。vite.config.ts が読み込む（下の「依存の向き」）
  e2e/          Playwright のテスト（*.test.ts。smoke.test.ts は全ルート、usecases/ はユースケースの通し）
packages/domain/src/      ドメイン型と、UIに依存しないゲームロジック（純粋関数）。
                          仕様ページに合わせたドメインごとのディレクトリ（下の「packages/domain の中の置き場所」）
packages/schemas/src/     API の一覧（メソッド・パス・本文・状態コードごとの応答）とリクエストの本文のスキーマ（zod）、
                          一覧から作る OpenAPI の文書。画面・将来のバックエンドが共用する
                          （下の「packages/schemas の中の置き場所」）
scripts/                  ビルド補助（GitHub Pages へのコピー、API ドキュメントの生成、ルールのテストのタグの一覧、ユースケースの結果のページ、要望からテストまでのトレースのページ）。
                          biome/ は Biome の GritQL のプラグイン（いまは無い。docs/process/rules/static-analysis.md「GritQL のプラグイン」）
```

迷ったらこの順で問う。

1. ゲームのルール・判定・変換で、React にも DOM にも依存しない → `packages/domain`。その中では、用語の持ち主の仕様ページに対応するディレクトリへ（下の「packages/domain の中の置き場所」）
2. 1つのページでしか使わない → そのページのスライス（`pages/<グループ>/<ページ>/`）のセグメントに置く（部品は `ui/`、副作用は `api/`、変換は `lib/`）。一度しか使わないものは、使う側に置く
3. 複数のページで使う → 何かで分ける。エンティティ（カード・シナリオなど）の見た目・取得・変更は `entities/<エンティティ>/`、利用者の操作と UI が対になったものは `features/`、画面の大きなまとまりは `widgets/`、業務のロジックを持たず、どこからでも使う部品・関数・静的な内容（UI の部品、ルート一覧など）は `shared/`。ただし2ページ目が現れるまで共通化しない

## 依存の向き

```text
apps/web ──→ packages/domain ──→ zod
   │              ↑
   └──→ packages/schemas ─┘（packages/schemas も zod を使う。apps/web は zod を直接は使わない）

scripts/build-api-docs.ts ──→ packages/schemas（API の一覧から OpenAPI の文書を作る）

packages/*/vitest.config.ts・apps/web/vite.config.ts ──→ scripts/rule-sections.mjs ──→ docs/cartagraph/*.md
                                                         （見出しからルールのテストのタグの一覧を作る）

scripts/build-trace-report.mjs ──→ scripts/build-usecase-report.mjs・scripts/build-rule-test-report.mjs（テストの結果の状態の計算を共用する）
                              └──→ docs/backlog/・docs/architecture/・docs/screens/・routes.ts（つながりの元。読むだけ）

scripts/check-usecase-tags.mjs・build-usecase-report.mjs・build-trace-report.mjs・check-trace.mjs・branch-id.mjs
                              ──→ scripts/trace.mjs ──→ docs/backlog/（要望の frontmatter の読み手。ほかの scripts を import しない）

apps/web/vite.config.ts ──→ apps/web/vite/proposals.ts ──→ scripts/trace.mjs（提案の要望を読む）・docs/backlog/（読む）
                                                      └──→ [ssrLoadModule] apps/web/vite/proposalApp.ts・proposalFile.ts
                                                            ──→ packages/domain・packages/schemas、docs/backlog/（書く）
```

- **要望を読む `scripts/trace.mjs`** — 要望の frontmatter（`trace`・`title`・`status`）の読み手を1つにする。`check-usecase-tags.mjs` はスキップしたテストの直す要望の状態と `trace` を、`build-usecase-report.mjs` は「スキップ中」のリンクの文字（要望の `title`）を読む。`trace.mjs` がほかの scripts を import すると、`build-trace-report.mjs` との間で循環になる（`noImportCycles`）

- **Vitest の設定から読む `scripts/rule-sections.mjs`** — 3パッケージの Vitest の設定がタグの一覧を作るために読む。設定は Vite がバンドルして読むので、Node が解決できない import をしない（`apps/web/vite/` と同じ。ただし `apps/web/vite/proposalApp.ts`・`proposalFile.ts` は、プラグインが `server.ssrLoadModule` で読む（Vite の変換を通す）ので、`@cartagraph/domain`・`@cartagraph/schemas` の TS を import してよい。`vite.config.ts` の読み込みには入れない。`proposals.ts` は domain の型を `import type` するだけにする）。Vitest は cwd がパッケージのディレクトリで動くので、読む場所は `import.meta.url` から組み立てたリポジトリの直下を基準にする。`apps/web/vite.config.ts` は tsc の対象なので、型は `scripts/rule-sections.d.mts` に置く。使い方は[テストのルール](testing.md)の「ルールのテストのタグ」
- **パッケージの間** — `apps/web` は `packages/domain` を参照してよい。逆は禁止。`packages/domain` は React・DOM に依存しない（下の「境界」）。`packages/schemas` は `packages/domain` を参照してよく、`apps/web` が参照する。`packages/domain` から `packages/schemas` は参照しない（domain は依存を宣言していないので、import すると解決に失敗して止まる）
- **`@cartagraph/schemas` を import してよい層** — `entities`（本文の型と、domain に無い応答の型）と、層の外の `test`、`apps/web/vite/` の `ssrLoadModule` で読むファイル（口が本文を検査する）だけ。ほかの層（app・pages・widgets・features・shared）からは Biome で止める（`biome.json` の層ごとの `noRestrictedImports`。後ろの override は前の override の禁止を置き換えるので、層の直下のファイル用の override にも書く）
- **packages/domain の中** — 下の層だけを import してよい（下の「packages/domain の中の置き場所」の図と表。Biome で機械的に止める）
- **apps/web の中** — FSD の層の順に、下の層だけを import してよい。同じ層の別スライスは import しない（`app → pages → widgets → features → entities → shared`）
  - スライスの外は `@/<層>/…` のエイリアス、スライスの中は相対パスで import する。エイリアスに `..`・`.` を入れない。相対パスは `./` か `../` を素直に重ねた形だけで書く（`../ui/../x`・`././x` のような形は検査をすり抜けるので書かない）
  - 層・グループのフォルダ（`pages/<グループ>/`）・スライスの直下にファイルを置かない（app を除く）。必ずセグメント（例：`ui`・`api`・`lib`・`model`。shared には `content`・`routes` もある）に入れ、セグメントの中にさらにフォルダを作らない。直下に置くと `../` だけで別のスライスに届き、深くすると同じスライスの中の import が検査に止められるため。グループのフォルダには共有コードを置かない
  - 公開 API の index.ts は作らない。スライスの外からもファイルを直接 import する（下の「境界」の barrel 禁止に従う。FSD も index を必須としていない）
  - `main.tsx`・`vite-env.d.ts`・`test/` は層の外。層の外は層を import してよい（`@/` で）。層は層の外を import しない
  - packages/domain との違い：domain の中は決まった向きならディレクトリをまたげるが、web の entities はエンティティどうしの import を禁止する（FSD）。複数のエンティティを組み合わせる UI は widgets か pages で組み合わせる。エンティティをまたぐキャッシュの無効化は、shared のクエリキーで行う
  - 機械的な検査は Biome（`biome.json` の `apps/web/src/<層>/**` ごとの `style/noRestrictedImports`）。禁止パターンの正は `biome.json`、理由はここ。層を足す・向きを変えるときは両方を直す。後ろの override は前の override の禁止を置き換えるので、層の直下のファイル用の override にも同じ禁止を書く（override の漏れを止める検査は持ち込んでいない。[体制の進化ログ](../evolution/2026-10.md)）

## packages/domain の中の置き場所

`packages/domain/src/` は、仕様ページ（`docs/cartagraph/`）に合わせたドメインごとのディレクトリに分ける。ディレクトリの一覧は下の表が正。ディレクトリは、ドメイン駆動設計で決めた[業務領域](../../architecture/domain-map.md)・[境界づけられたコンテキスト](../../architecture/bounded-contexts.md)・[集約](../../architecture/aggregates.md)とは1対1になっていない。コードを組み替えるときは、それらと既知の問題「ドメインモデル」を先に読む。

- **型は `model.ts`、ロジックは役割の名前のファイル** — 各ディレクトリの型は `model.ts` に置き、zod スキーマ・型（`z.infer`）・ラベルを隣り合わせにする。JSON に書くもの（シナリオ・ルール）と API の応答に入るもの（キャラクターなど）は、zod スキーマを正にして型を `z.infer` で導く（`packages/schemas` が API の一覧と OpenAPI に使う）。ロジックは `resolve.ts`・`refs.ts`・`transition.ts` のように役割で名づける。テストは対象と同じディレクトリに、対象のファイル名で置く
- **直下にファイルを置かない。`index.ts` を作らない** — 利用側は `@cartagraph/domain/<ディレクトリ>/<ファイル>` を直接 import する（`package.json` の `exports` はワイルドカード）。domain の中は相対パスで import し、自分のパッケージ名では import しない
- **新しいディレクトリを足すときは、下の依存の表にも足す**

### ディレクトリと依存の向き

下の層だけを import してよい（同じディレクトリの中は自由）。

| ディレクトリ | 仕様ページ |
|---|---|
| `scenario`（シナリオ・シーン・ビート・手札・プレイの状態とプレイログ・遊んだことのイベントの列と流し直し・提案の決まり。ほかのディレクトリを import しない） | `index` |

**機械的な検査は Biome**（コミット前のフックと CI の lint）。各ディレクトリが import してよい先の正は `biome.json` の `overrides`（`style/noRestrictedImports` の許可リスト）。循環は `suspicious/noImportCycles`、barrel は下の「境界」の barrel 禁止に従う。ディレクトリを足す・依存の向きを変えるときは、この節と `biome.json` を一緒に直す（`biome.json` はコメントを書けないので、理由はここに書く）。

## packages/schemas の中の置き場所

`packages/schemas/src/` は、API の URL の最初の区切りごとのディレクトリ（名前は区切りと同じ。いまは `proposals/`）と、共通の `body/`（本文の検査）・`endpoint/`（一覧の1項目の定義）、全体をまとめる `api/` に分ける。

- 各ディレクトリの `request.ts` に、エンドポイントごとの本文のスキーマを `defineBody(スキーマ, 個別のメッセージの表)` で置く。書くのは形だけ（型・必須か・配列の要素の形）で、業務の検査は受け取る側・ドメインに残す
- 各ディレクトリの `endpoints.ts` に、その区切りの API の一覧を `defineEndpoint` で置く（メソッド・パス・本文と、返しうる状態コードごとの応答の形。失敗の本文はどれも `{ message }`）。`response.ts` には、`packages/domain` に無い応答の形だけを置く。応答の形の多くは domain の zod スキーマを使う
- `api/endpoints.ts` が全ディレクトリの一覧を1本にまとめ、`api/openapi.ts` がそこから OpenAPI の文書を作る
- 列挙などは `packages/domain` のスキーマから引き、書き写さない
- 直下にファイルを置かない・`index.ts` を作らない・自分のパッケージ名で import しない（`packages/domain` と同じ決まり）
- 依存の向き：`api/` → 各ディレクトリ・`endpoint/`・`body/`、各ディレクトリ → `endpoint/`・`body/`、`endpoint/` → `body/`。`body/` はどこにも依存しない（zod だけ）。各ディレクトリと `api/` は `@cartagraph/domain`・zod も使ってよく、`endpoint/` は zod だけ。機械的な検査は Biome（`biome.json` の `packages/schemas/src/**` の override。区切りのディレクトリ（いまは `proposals/`）ごとに、`endpoint/`・`body/` だけを許す override を作って `includes` にそのディレクトリを書き、`api/` の override の許可にも足す。新しいディレクトリは、その2か所に足す。足し忘れても、全体の override がほかのディレクトリの import を止める）

## React の書き方

React のコードは、Vercel Labs の [react-best-practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices)（性能の70ルール・8カテゴリ。MIT）に沿って書き、レビューする。リポジトリには `.claude/skills/react-best-practices/` に取り込んである（取り込んだコミットは同じ場所の `VENDOR.md`。Claude Code 以外のツールでも、このファイル群か配布元を読めばよい）。

- **対象外のルール** — Next.js・サーバーを前提にしたもの（`server-` で始まるルール、RSC・Server Actions・`next/dynamic`・`after()`・ハイドレーション（`rendering-hydration-`）・`client-swr-dedup`）。このアプリは Vite の SPA
- **Biome で機械的に止めているもの**（`biome.json`。コミット前のフックと CI の lint）
  - `rerender-dependencies`・`advanced-effect-event-deps` → `correctness/useExhaustiveDependencies`（推奨ルールとして有効）
  - `rerender-no-inline-components` → `correctness/noNestedComponentDefinitions`
  - フックの呼び方 → `correctness/useHookAtTopLevel`
  - `bundle-barrel-imports` → 下の「境界」の barrel 禁止
- **Biome に対応があっても有効にしていないもの**
  - `rendering-conditional-render` → `suspicious/noLeakedRender`：型を見ずに `&&` を一律に指摘するので、真偽値・文字列の条件まで誤検知する。数値が漏れるかはレビューで見る
  - `js-hoist-regexp` → `performance/useTopLevelRegex`：前のリポジトリでは既存コードに違反があって有効にしていなかった。コードが少ないうちに有効にするかは、最初に React のコードを書くときに決める

## 1ファイル1責務

- ファイルの担当を一文で言えること。「シーンの画面」は合格、「プレイ周りのUIいろいろ」は失格
- ファイルが肥大したら、責務の境界で割る。関数・ファイルの行数と認知的複雑度の上限は Biome で止める（しきい値は[静的解析ルール](static-analysis.md)「コードの複雑さ」）（例：ページの中の大きな一区画を、そのページのスライスの `ui/` に別ファイルとして切り出す。複数のページで使うなら widgets・entities へ）
- **上限に引っかかったら** — 関数を分ける（判定・計算は純粋関数へ出す。下の「副作用の分離」）。React のコンポーネントなら、画面の一区画を子コンポーネントに切り出す。しきい値を上げて通すことはしない
- **`biome-ignore` で抑えるとき** — 新しく足すのは、分けるとかえって読みにくくなる理由があるときだけにし、その理由をコメントに書く。レビューで理由を確かめる
- ルート・ナビ・サイトマップの情報は `shared/routes/routes.ts` だけが持つ。他のファイルにパスの一覧を書かない（ページから使うので shared に置く。ページを並べる `app/router.tsx` は app）

## 境界

- `packages/domain`・`packages/schemas` は React・DOM に依存しない（将来のバックエンドも使うため）。`apps/web` から `packages/domain` を参照し、逆は禁止
- `packages/domain` の型と用語は `docs/` の用語に対応させる。**用語の意味を変えるときは docs を先に更新する**（SSOT）
- barrel export（`index.ts` への集約・再エクスポート）は新規に作らない。実ファイルへ直接 import する（`packages/domain`・`packages/schemas`・`apps/web/src` は Biome の `noBarrelFile`・`noReExportAll` で止める）
- 業務コードに `console.*` を残さない（`biome.json`の`noConsole`がコミット前フックで機械的に検知して止める。`scripts/`配下のNode.jsビルドスクリプトは対象外）。構造化ログの方針はバックエンド着手時に定める

## 副作用の分離（Functional Core / Imperative Shell）

- ゲームの判定・計算・変換（比較判定、デッキのフィルタ、状態遷移の可否など）は純粋関数に集め、`packages/domain` か、apps/web のスライスの `lib/` セグメント（複数で使うなら `shared/lib/`）に置く（Functional Core）
- API 呼び出し・ローカルストレージ・時刻・乱数・環境変数の参照は、フック・ハンドラなど外側の薄い層へ寄せ、Core が返した結果を実行するだけに近づける（Imperative Shell）
- 狙いは、複雑なロジックをブラウザ無しでテストできる形に保つこと

## 将来のバックエンド（予約）

バックエンドに着手したら、次を詳細化する。それまでは原則だけ置いておく。

- マイグレーションは前進のみ（forward only）。適用済みファイルは編集しない
- DB が守るもの（一意性・参照整合・値域・同時実行で破れる不変条件）と、アプリが守るもの（認可・業務フローの順序・外部サービスとの整合）を分ける。判断基準は「UIを通らない書き込みでも絶対に壊れてはいけないか」
- 秘密値（トークン・APIキー・生の個人情報）をログに書かない
