// OpenAPI の文書。一覧と自分を比べるだけでなく、参照が解決すること・本文と応答の厳しさ・省略可能と null の表し方を、
// 文書の側から確かめる。本物の一覧はまだ空なので、見本の一覧を渡して組み立て方を確かめる。

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineBody } from '../body/parse';
import { defineEndpoint, failure, success } from '../endpoint/define';
import { endpoints } from './endpoints';
import { buildOpenApiDocument } from './openapi';

type Json = Record<string, unknown>;

const itemSchema = z.strictObject({ id: z.string(), note: z.string().optional(), at: z.null() });

const sample = [
  defineEndpoint({
    method: 'get',
    path: '/items/:id',
    summary: '1件を読む',
    responses: { 200: success('1件', itemSchema), 404: failure('無い') },
  }),
  defineEndpoint({
    method: 'post',
    path: '/items/:id/notes/:nid',
    summary: '書く',
    body: defineBody(z.object({ text: z.string() })),
    responses: { 201: success('書いた', itemSchema) },
  }),
  defineEndpoint({
    method: 'post',
    path: '/items',
    summary: '本文が省ける',
    body: defineBody(z.object({ text: z.string().optional() })),
    responses: { 201: success('作った', itemSchema) },
  }),
];

const doc = buildOpenApiDocument(sample);
const paths = doc.paths as Record<string, Record<string, Json>>;
const schemas = (doc.components as { schemas: Record<string, Json> }).schemas;
const text = JSON.stringify(doc);

const op = (method: string, path: string): Json => {
  const o = paths[path]?.[method];
  if (!o) throw new Error(`文書に無い：${method} ${path}`);
  return o;
};
const responseSchema = (o: Json, status: string) =>
  (o.responses as Record<string, { content: { 'application/json': { schema: Json } } }>)[status]
    ?.content['application/json'].schema;

describe('OpenAPI の文書', () => {
  it('本物の一覧（空でもよい）から 3.1 の文書ができる', () => {
    const real = buildOpenApiDocument();
    expect(real.openapi).toBe('3.1.0');
    expect(Object.keys(real.paths as Json)).toHaveLength(endpoints.length);
  });

  it('本物の一覧：POST /proposals が 201・403・422・500 と本文のスキーマ（PlayEvent の名前付き）つきで出て、servers は /api', () => {
    const real = buildOpenApiDocument();
    const realPaths = real.paths as Record<string, Record<string, Json>>;
    const post = realPaths['/proposals']?.post;
    expect(Object.keys((post?.responses as Json) ?? {})).toEqual(['201', '403', '422', '500']);
    expect(post?.requestBody).toMatchObject({ required: true });
    const realSchemas = (real.components as { schemas: Record<string, Json> }).schemas;
    expect(realSchemas.PlayEvent).toBeDefined();
    expect(JSON.stringify(post?.requestBody)).toContain('#/components/schemas/PlayEvent');
    expect((real.servers as { url: string }[])[0]?.url).toBe('/api');
    expect((real.tags as { name: string }[]).map((t) => t.name)).toContain('proposals');
  });

  it('使われない型は components に載せない（redocly の no-unused-components）', () => {
    const empty = buildOpenApiDocument([]);
    expect((empty.components as { schemas: Json }).schemas).toEqual({});
  });

  it('一覧のすべての API が paths に出る', () => {
    const count = Object.values(paths).reduce((n, p) => n + Object.keys(p).length, 0);
    expect(count).toBe(sample.length);
  });

  it('パスの引数は {id} の形で、parameters に path・必須で出る', () => {
    const o = op('post', '/items/{id}/notes/{nid}');
    expect(o.parameters).toEqual([
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      { name: 'nid', in: 'path', required: true, schema: { type: 'string' } },
    ]);
    expect(Object.keys(paths).some((p) => p.includes(':'))).toBe(false);
  });

  it('本文を読む API にだけ requestBody が出る。{} が通る本文は省いてよい', () => {
    expect(op('post', '/items/{id}/notes/{nid}').requestBody).toMatchObject({ required: true });
    expect(op('post', '/items').requestBody).toMatchObject({ required: false });
    expect(op('get', '/items/{id}').requestBody).toBeUndefined();
  });

  it('状態コードごとに応答が出て、失敗の応答は { message } の型を参照する', () => {
    const o = op('get', '/items/{id}');
    expect(Object.keys(o.responses as Json)).toEqual(['200', '404']);
    expect(responseSchema(o, '404')).toEqual({ $ref: '#/components/schemas/Error' });
    expect(schemas.Error).toMatchObject({ required: ['message'], additionalProperties: false });
  });

  it('省略可能な項目は required に入らず、null を持つ項目は null を許す', () => {
    const item = responseSchema(op('get', '/items/{id}'), '200') as {
      required: string[];
      properties: Record<string, Json>;
    };
    expect(item.required).not.toContain('note');
    expect(item.required).toContain('at');
    expect(JSON.stringify(item.properties.at)).toContain('"null"');
  });

  it('すべての $ref が components.schemas の実在する型を指す（壊れた参照・$defs・$id・$schema が残らない）', () => {
    const refs = [...text.matchAll(/"\$ref":"([^"]+)"/g)].map((m) => m[1] as string);
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      expect(ref).toMatch(/^#\/components\/schemas\//);
      expect(schemas[ref.slice('#/components/schemas/'.length)]).toBeDefined();
    }
    expect(text).not.toContain('$defs');
    expect(text).not.toContain('"$id"');
    expect(text).not.toContain('"$schema"');
  });

  it('タグは URL の最初の区切りで、使ったものだけが出る', () => {
    expect(op('get', '/items/{id}').tags).toEqual(['items']);
    expect((doc.tags as { name: string }[]).map((t) => t.name)).toEqual(['items']);
  });

  it('operationId は重複しない', () => {
    const ids = Object.values(paths).flatMap((p) => Object.values(p).map((o) => o.operationId));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
