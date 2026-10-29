// 応答が一覧どおりかの検査。

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { checkResponse } from './check';
import { defineEndpoint, failure, success } from './define';

const endpoint = defineEndpoint({
  method: 'get',
  path: '/items/:id',
  summary: '1件を読む',
  responses: {
    200: success('1件', z.strictObject({ id: z.string(), tags: z.array(z.string()) })),
    404: failure('無い'),
  },
});

describe('checkResponse', () => {
  it('一覧どおりなら誤りは無い', () => {
    expect(checkResponse(endpoint, 200, { id: 'a', tags: [] })).toEqual([]);
    expect(checkResponse(endpoint, 404, { message: '無い' })).toEqual([]);
  });

  it('一覧に無い状態コードは、一覧にあるものを並べて誤りにする', () => {
    expect(checkResponse(endpoint, 500, {})).toEqual([
      'GET /items/:id → 500：一覧に無い状態コード（一覧にあるのは 200・404）',
    ]);
  });

  it('形の誤りは場所つきで返す', () => {
    expect(checkResponse(endpoint, 200, { id: 1, tags: [] })).toEqual([
      expect.stringMatching(/^GET \/items\/:id → 200：id が一覧の形と違う/),
    ]);
  });

  it('誤りが多いときは5件まで並べ、残りは件数にまとめる', () => {
    const result = checkResponse(endpoint, 200, { id: 'a', tags: [1, 2, 3, 4, 5, 6, 7] });
    expect(result).toHaveLength(6);
    expect(result[5]).toBe('GET /items/:id → 200：ほか 2 件');
  });
});
