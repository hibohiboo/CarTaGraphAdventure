// API の一覧。

import { describe, expect, it } from 'vitest';
import { routeKey } from '../endpoint/define';
import { endpoints } from './endpoints';

describe('API の一覧', () => {
  it('同じメソッドとパス（引数の名前はそろえる）が2回出ない', () => {
    const keys = endpoints.map(routeKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('提案を書く POST /proposals が、201・403・422・500 の応答つきで載っている', () => {
    const proposals = endpoints.find((e) => routeKey(e) === 'POST /proposals');
    expect(proposals).toBeDefined();
    expect(Object.keys(proposals?.responses ?? {}).sort()).toEqual(['201', '403', '422', '500']);
    expect(proposals?.body).toBeDefined();
  });

  it('パスは / で始まり、/api を付けない', () => {
    for (const e of endpoints) {
      expect(e.path).toMatch(/^\//);
      expect(e.path.startsWith('/api')).toBe(false);
    }
  });
});
