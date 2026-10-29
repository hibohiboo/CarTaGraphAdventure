// API の一覧。

import { describe, expect, it } from 'vitest';
import { routeKey } from '../endpoint/define';
import { endpoints } from './endpoints';

describe('API の一覧', () => {
  it('同じメソッドとパス（引数の名前はそろえる）が2回出ない', () => {
    const keys = endpoints.map(routeKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('パスは / で始まり、/api を付けない', () => {
    for (const e of endpoints) {
      expect(e.path).toMatch(/^\//);
      expect(e.path.startsWith('/api')).toBe(false);
    }
  });
});
