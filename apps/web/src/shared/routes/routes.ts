// ルート定義のメタデータ。パスの一覧の唯一の情報源。
// 実際の要素との対応は app/router.tsx で行う。
// ルートを足す・消す・パスを変えたら、docs/screens/index.md の画面の一覧と導線図も直す（食い違うと pnpm docs:build が止まる）。

export type RouteGroup = 'common' | 'pl';

export const GROUP_LABEL: Record<RouteGroup, string> = {
  common: '共通',
  pl: 'PL',
};

export interface RouteMeta {
  path: string;
  title: string;
  group: RouteGroup;
  description: string;
  /** 動的ルートを開くときの具体例 */
  example?: string;
}

export const routes: RouteMeta[] = [
  {
    path: '/',
    title: 'ホーム',
    group: 'common',
    description: '最初の画面。冒険者登録の試験への入口になる',
  },
];
