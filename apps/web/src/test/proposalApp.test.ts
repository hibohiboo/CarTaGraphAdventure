// @vitest-environment node
// 開発サーバーの口（docs/plans/2026-10-31-P6-提案の保存.md D4・テスト18〜26）。HTTP のサーバーを立てず、app.request で叩く
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { adventurerExam } from '@cartagraph/domain/scenario/adventurer-exam';
import { replay } from '@cartagraph/domain/scenario/events';
import type { PlayEvent } from '@cartagraph/domain/scenario/model';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createProposalApp } from '../../vite/proposalApp';

const approach: PlayEvent = { type: 'cardPlayed', beatId: 'entrance', cardId: 'approach' };
const now = new Date(2026, 9, 31, 15, 30, 12);

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'proposals-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const app = () => createProposalApp({ backlogDir: dir, now: () => now });

const post = (
  body: unknown,
  options: { from?: string | undefined; headers?: Record<string, string> } = {},
  target = app(),
) => {
  // from: undefined は「送り元が分からない」。省いたときだけ既定のループバック
  const from = 'from' in options ? options.from : '127.0.0.1';
  const headers = options.headers ?? {};
  return target.request(
    '/api/proposals',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', host: 'localhost:5173', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    },
    { incoming: { socket: { remoteAddress: from } } },
  );
};

const valid = { scenarioId: 'adventurer-exam', text: '試験官に質問したい', events: [approach] };

const files = () => readdir(dir);

/** ファイルの JSON の列を読み戻す */
const eventsIn = async (name: string): Promise<PlayEvent[]> => {
  const md = await readFile(join(dir, name), 'utf8');
  const tail = md.slice(md.indexOf('\n## そこまでに遊んだこと\n'));
  const m = tail.match(/^(`{3,})json\n([\s\S]*?)\n\1$/m);
  return JSON.parse(m?.[2] ?? 'null') as PlayEvent[];
};

describe('POST /api/proposals', () => {
  it('正しい本文で 201 と { file }（/ 区切り）、ファイルが1つできて、中の列を replay すると提案したビートに戻る', async () => {
    const res = await post(valid);
    expect(res.status).toBe(201);
    const { file } = (await res.json()) as { file: string };
    expect(file).not.toContain('\\');
    expect(file.endsWith('/proposal-20261031-153012.md')).toBe(true);
    expect(await files()).toEqual(['proposal-20261031-153012.md']);
    const events = await eventsIn('proposal-20261031-153012.md');
    expect(events.at(-1)).toEqual({
      type: 'proposed',
      beatId: 'reception',
      text: '試験官に質問したい',
    });
    const replayed = replay(adventurerExam, events);
    expect(replayed.ok && replayed.state.beatId).toBe('reception');
  });

  it('前の proposed を含む列でも通り、ファイルの列の末尾が新しい proposed', async () => {
    const earlier: PlayEvent = { type: 'proposed', beatId: 'reception', text: '前の提案' };
    const res = await post({ ...valid, events: [approach, earlier] });
    expect(res.status).toBe(201);
    const events = await eventsIn((await files())[0] as string);
    expect(events).toHaveLength(3);
    expect(events[1]).toEqual(earlier);
    expect(events[2]).toMatchObject({ type: 'proposed', text: '試験官に質問したい' });
  });

  it('同じ秒に2回提案すると、2つ目は -2、3つ目は -3 の名前になり、前のものを上書きしない', async () => {
    const target = app();
    for (const text of ['一つ目', '二つ目', '三つ目']) {
      expect((await post({ ...valid, text }, {}, target)).status).toBe(201);
    }
    expect((await files()).sort()).toEqual([
      'proposal-20261031-153012-2.md',
      'proposal-20261031-153012-3.md',
      'proposal-20261031-153012.md',
    ]);
    expect(await readFile(join(dir, 'proposal-20261031-153012.md'), 'utf8')).toContain('一つ目');
    expect(await readFile(join(dir, 'proposal-20261031-153012-3.md'), 'utf8')).toContain('三つ目');
  });

  it('書く先が無いディレクトリなら 500（ENOENT で番号を進め続けない）', async () => {
    const missing = createProposalApp({ backlogDir: join(dir, 'nope'), now: () => now });
    const res = await post(valid, {}, missing);
    expect(res.status).toBe(500);
    expect(await res.json()).toHaveProperty('message');
  });
});

describe('送り元の検査', () => {
  const allowed = [
    '127.0.0.1',
    '127.255.255.255',
    '::1',
    '::ffff:127.0.0.1',
    '192.168.1.5',
    '::ffff:192.168.1.5',
    '10.0.0.1',
    '172.16.0.1',
    '172.31.255.255',
  ];
  const denied = [
    '172.15.255.255',
    '172.32.0.1',
    '192.169.0.1',
    '11.0.0.1',
    '169.254.1.1',
    '8.8.8.8',
    '::ffff:8.8.8.8',
    '::ffff:172.32.0.1',
    'fc00::1',
    'fe80::1',
    undefined,
  ];

  it.each(allowed)('%s は通る', async (from) => {
    expect((await post(valid, { from })).status).toBe(201);
  });

  it.each(denied)('%s は 403 で、ファイルができない', async (from) => {
    const res = await post(valid, { from });
    expect(res.status).toBe(403);
    expect(await res.json()).toHaveProperty('message');
    expect(await files()).toEqual([]);
  });

  it('env が無い（送り元が分からない）ときも 403', async () => {
    const res = await app().request('/api/proposals', {
      method: 'POST',
      body: JSON.stringify(valid),
    });
    expect(res.status).toBe(403);
  });
});

describe('Origin の検査', () => {
  it('Origin が無ければ通る。Host と同じなら通る', async () => {
    expect((await post(valid)).status).toBe(201);
    expect((await post(valid, { headers: { origin: 'http://localhost:5173' } })).status).toBe(201);
  });

  it.each([
    ['別のホスト', { origin: 'https://evil.example', host: 'localhost:5173' }],
    ['同じホストの別のポート', { origin: 'http://localhost:9999', host: 'localhost:5173' }],
    ['null', { origin: 'null', host: 'localhost:5173' }],
    ['URL として読めない値', { origin: 'not a url', host: 'localhost:5173' }],
  ])('%s は 403 で、ファイルができない', async (_, headers) => {
    const res = await post(valid, { headers });
    expect(res.status).toBe(403);
    expect(await files()).toEqual([]);
  });

  it('Origin があって Host が無いときは 403', async () => {
    const res = await app().request(
      '/api/proposals',
      {
        method: 'POST',
        // Host を空にして送る（Hono の app.request は Host を補わない）
        headers: { origin: 'http://localhost:5173' },
        body: JSON.stringify(valid),
      },
      { incoming: { socket: { remoteAddress: '127.0.0.1' } } },
    );
    expect(res.status).toBe(403);
  });
});

describe('本文の検査', () => {
  const MB = 1024 * 1024;
  const byteLength = (s: string) => new TextEncoder().encode(s).length;
  /** 正しい本文の前に空白を足して、ちょうど size バイトにする（先頭の空白は JSON として読める） */
  const withBytes = (size: number) => {
    const json = JSON.stringify(valid);
    return ' '.repeat(size - byteLength(json)) + json;
  };

  it('本文が 1 MB を1バイト超えたら 422（ファイルはできない）', async () => {
    const body = withBytes(MB + 1);
    expect(byteLength(body)).toBe(MB + 1);
    const res = await post(body);
    expect(res.status).toBe(422);
    expect(await files()).toEqual([]);
  });

  it('本文が 1 MB ちょうどなら、長さの検査を通って 201（先頭の空白は JSON として読める）', async () => {
    const body = withBytes(MB);
    expect(byteLength(body)).toBe(MB);
    expect((await post(body)).status).toBe(201);
  });

  it('重い書記素（👨‍👩‍👧‍👦）で4000文字ちょうどの文は 201', async () => {
    const text = '👨‍👩‍👧‍👦'.repeat(4000);
    const res = await post({ ...valid, text });
    expect(res.status).toBe(201);
  });

  it.each([
    ['JSON でない', 'これは JSON ではない'],
    ['text が無い', { scenarioId: 'adventurer-exam', events: [] }],
    ['scenarioId が文字列でない', { ...valid, scenarioId: 1 }],
    ['events が配列でない', { ...valid, events: {} }],
    ['events の要素が壊れている', { ...valid, events: [{ type: 'cardPlayed' }] }],
    ['余分なキーがある', { ...valid, extra: 1 }],
  ])('%s → 422', async (_, body) => {
    const res = await post(body);
    expect(res.status).toBe(422);
    expect(await res.json()).toHaveProperty('message');
    expect(await files()).toEqual([]);
  });

  it('無いシナリオ → 422', async () => {
    expect((await post({ ...valid, scenarioId: 'no-such' })).status).toBe(422);
    expect(await files()).toEqual([]);
  });

  it('replay が断る列（ビートの違うイベント・無いカード）→ 422', async () => {
    expect((await post({ ...valid, events: [{ ...approach, beatId: 'reception' }] })).status).toBe(
      422,
    );
    expect((await post({ ...valid, events: [{ ...approach, cardId: 'nope' }] })).status).toBe(422);
    expect(await files()).toEqual([]);
  });

  it('文が空・空白だけ・4001文字 → 422', async () => {
    expect((await post({ ...valid, text: '' })).status).toBe(422);
    expect((await post({ ...valid, text: '  \n ' })).status).toBe(422);
    expect((await post({ ...valid, text: 'あ'.repeat(4001) })).status).toBe(422);
    expect(await files()).toEqual([]);
  });
});

describe('知らないパス', () => {
  it('Hono が 404 を返す', async () => {
    const res = await app().request(
      '/api/unknown',
      { method: 'POST' },
      { incoming: { socket: { remoteAddress: '127.0.0.1' } } },
    );
    expect(res.status).toBe(404);
  });
});
