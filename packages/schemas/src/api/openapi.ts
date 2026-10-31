// API の一覧（endpoints.ts）から OpenAPI 3.1 の文書を作る。
// zod 4 の z.toJSONSchema で各スキーマを JSON Schema（2020-12。OpenAPI 3.1 と同じ）にし、名前の付いた型は
// components.schemas に1回だけ出して $ref で参照する。scripts/build-api-docs.ts が JSON に書き、Redoc の HTML にする。

import { playEventSchema } from '@cartagraph/domain/scenario/model';
import { z } from 'zod';
import { type Endpoint, errorBodySchema } from '../endpoint/define';
import { endpoints as allEndpoints } from './endpoints';

type Json = Record<string, unknown>;

/**
 * components.schemas に名前で出す型。循環するスキーマは必ず登録する
 * （登録しないと、名前の無い循環が壊れた参照になる）
 */
const named: [z.ZodType, string, string?][] = [
  [errorBodySchema, 'Error', '失敗の応答の本文。どの API も同じ形'],
  [playEventSchema, 'PlayEvent', '遊んだことのイベント。列を流し直すと状態に戻る'],
];

const registry = z.registry<{ id: string; description?: string }>();
for (const [schema, id, description] of named) {
  registry.add(schema, description ? { id, description } : { id });
}

/** タグ（URL の最初の区切り）の説明 */
const TAGS: Record<string, string> = {
  proposals: 'GM への提案。要望のファイルになる',
};

const REF_FROM = '#/$defs/';
const REF_TO = '#/components/schemas/';

/** $defs の参照を components の参照に書き換える（入れ子もすべて） */
function rewriteRefs(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(rewriteRefs);
  if (value === null || typeof value !== 'object') return value;
  const out: Json = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = k === '$ref' && typeof v === 'string' ? v.replace(REF_FROM, REF_TO) : rewriteRefs(v);
  }
  return out;
}

/** 1つのスキーマを変換し、名前の付いた型は components に移す。同じ名前で中身が違えば誤り */
function convert(schema: z.ZodType, io: 'input' | 'output', components: Json): Json {
  const { $schema: _, $defs, ...rest } = z.toJSONSchema(schema, { metadata: registry, io }) as Json;
  for (const [id, def] of Object.entries(($defs as Json | undefined) ?? {})) {
    const rewritten = rewriteRefs(def);
    if (id in components && JSON.stringify(components[id]) !== JSON.stringify(rewritten)) {
      throw new Error(`components.schemas の ${id} が、変換のたびに違う形になった`);
    }
    components[id] = rewritten;
  }
  return rewriteRefs(rest) as Json;
}

/** タグは URL の最初の区切り（`/proposals/:id` → `proposals`） */
const tagOf = (e: Endpoint): string => e.path.split('/')[1] ?? '';

const pathParams = (path: string): string[] =>
  [...path.matchAll(/:([^/]+)/g)].map((m) => m[1] as string);

/** `/sessions/:id/play` → `/sessions/{id}/play` */
const openApiPath = (path: string) => path.replace(/:([^/]+)/g, '{$1}');

/** `POST /sessions/:id/play` → `postSessionsByIdPlay` */
function operationId(e: Endpoint): string {
  const words = e.path
    .split('/')
    .filter(Boolean)
    .map((seg) => (seg.startsWith(':') ? `by-${seg.slice(1)}` : seg))
    .flatMap((seg) => seg.split('-'));
  return e.method + words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

function operation(e: Endpoint, components: Json): Json {
  const parameters: Json[] = pathParams(e.path).map((name) => ({
    name,
    in: 'path',
    required: true,
    schema: { type: 'string' },
  }));
  const responses: Json = {};
  for (const [status, res] of Object.entries(e.responses)) {
    if (!res) continue;
    responses[status] = {
      description: res.description,
      content: { 'application/json': { schema: convert(res.schema, 'output', components) } },
    };
  }
  return {
    operationId: operationId(e),
    summary: e.summary,
    ...(e.description ? { description: e.description } : {}),
    tags: [tagOf(e)],
    ...(parameters.length > 0 ? { parameters } : {}),
    ...(e.body
      ? {
          requestBody: {
            // 本文が空なら {} として読むので、{} が通る本文は省いてよい
            required: !e.body.schema.safeParse({}).success,
            content: {
              'application/json': { schema: convert(e.body.schema, 'input', components) },
            },
          },
        }
      : {}),
    responses,
  };
}

/** OpenAPI 3.1 の文書。endpoints はテストで差し替える */
export function buildOpenApiDocument(endpoints: readonly Endpoint[] = allEndpoints): Json {
  const components: Json = {};
  const paths: Record<string, Json> = {};
  for (const e of endpoints) {
    const p = openApiPath(e.path);
    paths[p] = { ...paths[p], [e.method]: operation(e, components) };
  }
  const usedTags = [...new Set(endpoints.map(tagOf))];
  return {
    openapi: '3.1.0',
    info: {
      title: 'カルタグラフ・アドベンチャー API',
      version: '0.0.0',
      description:
        'カルタグラフ・アドベンチャーの Web アプリが使う API。バックエンドは無く、開発サーバーの口（apps/web/vite/）だけがある。一覧の正は packages/schemas。',
    },
    servers: [{ url: '/api', description: 'ローカルの開発サーバー。公開版には無い' }],
    tags: usedTags.map((name) => ({ name, description: TAGS[name] ?? name })),
    paths,
    components: { schemas: components },
  };
}
