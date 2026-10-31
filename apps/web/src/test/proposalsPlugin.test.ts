// @vitest-environment node
// 提案の口のプラグイン（docs/plans/2026-10-31-P6-提案の保存.md D4・D5・テスト27・28）。
// Vite の開発サーバー（ミドルウェアのモード）を実際に起動し、本物の HTTP で叩く

import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { createServer as createHttpServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLogger, createServer, type ViteDevServer } from 'vite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { proposals } from '../../vite/proposals';

const root = fileURLToPath(new URL('../..', import.meta.url));

let dir: string;
let vite: ViteDevServer;
let http: Server;
let base: string;
let warnings: string[];

const start = async (backlogDir: string | null) => {
  warnings = [];
  const logger = createLogger('warn', { allowClearScreen: false });
  logger.warn = (message) => {
    warnings.push(message);
  };
  vite = await createServer({
    root,
    configFile: false,
    logLevel: 'warn',
    customLogger: logger,
    appType: 'custom',
    server: { middlewareMode: true },
    plugins: [proposals({ backlogDir })],
  });
  http = createHttpServer((req, res) => {
    vite.middlewares(req, res, () => {
      res.statusCode = 404;
      res.end('fallthrough');
    });
  });
  await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
};

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'proposals-plugin-'));
});
afterEach(async () => {
  await vite?.close();
  await new Promise((resolve) => http?.close(resolve));
  await rm(dir, { recursive: true, force: true });
});

const body = {
  scenarioId: 'adventurer-exam',
  text: '試験官に質問したい',
  events: [{ type: 'cardPlayed', beatId: 'entrance', cardId: 'approach' }],
};

const postJson = (payload: unknown) =>
  fetch(`${base}/api/proposals`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

describe('開発サーバーの口', () => {
  it('POST /api/proposals で 201 とファイルができる（ssrLoadModule と getRequestListener を通り、送り元が本物の socket から読める）', async () => {
    await start(dir);
    const res = await postJson(body);
    expect(res.status).toBe(201);
    const { file } = (await res.json()) as { file: string };
    expect(file).toMatch(/\/proposal-\d{8}-\d{6}\.md$/);
    expect(await readdir(dir)).toHaveLength(1);
  });

  it('/api/ で始まらないパスは Vite に通す（/apix/ も Hono に渡さない）', async () => {
    await start(dir);
    for (const path of ['/not-api', '/apix/proposals']) {
      const res = await fetch(`${base}${path}`, { method: 'POST' });
      expect(res.status).toBe(404);
      expect(await res.text()).toBe('fallthrough');
    }
  });

  it('Content-Length を付けずに 1 MB を超える本文を流すと 422 が返り、ファイルはできない', async () => {
    await start(dir);
    const chunk = new TextEncoder().encode('x'.repeat(64 * 1024));
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= 20) return controller.close();
        sent++;
        controller.enqueue(chunk);
      },
    });
    const res = await fetch(`${base}/api/proposals`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: stream,
      // @ts-expect-error Node の fetch が要る。lib.dom の型には無い
      duplex: 'half',
    });
    expect(res.status).toBe(422);
    expect(await readdir(dir)).toEqual([]);
  });
});

const proposalMd = (status: string, beat = 'reception') =>
  `---\ntitle: "提案：x"\nmilestone: proposal-loop\nstatus: ${status}\nsummary: "要約 ${status}"\nproposal:\n  scenario: adventurer-exam\n  scene: guild-reception\n  beat: ${beat}\ntrace:\n  usecases: [PL-2]\n  screens: [/exam]\nupdated: 2026-10-31\n---\n\n# 提案\n`;

const pendingList = async (): Promise<
  { scenarioId: string; beatId: string; summary: string }[]
> => {
  const result = await vite.transformRequest('virtual:proposals');
  const code = result?.code ?? '';
  const m = code.match(/export default (.*);/s);
  return JSON.parse(m?.[1] ?? 'null');
};

describe('仮想モジュール virtual:proposals', () => {
  it('未着手・進行中の提案は入り、完了・見送りと、ふつうの要望は入らない', async () => {
    await writeFile(join(dir, 'proposal-1.md'), proposalMd('未着手'));
    await writeFile(join(dir, 'proposal-2.md'), proposalMd('進行中', 'exam-begins'));
    await writeFile(join(dir, 'proposal-3.md'), proposalMd('完了'));
    await writeFile(join(dir, 'proposal-4.md'), proposalMd('見送り'));
    await writeFile(join(dir, 'ordinary.md'), '---\ntitle: ふつう\nstatus: 未着手\n---\n\n本文\n');
    await writeFile(join(dir, 'index.md'), '# 要望\n');
    await start(dir);
    expect(await pendingList()).toEqual([
      { scenarioId: 'adventurer-exam', beatId: 'reception', summary: '要約 未着手' },
      { scenarioId: 'adventurer-exam', beatId: 'exam-begins', summary: '要約 進行中' },
    ]);
    expect(warnings).toEqual([]);
  });

  it('知らない綴りの状態は未完了として入り、警告が出る', async () => {
    await writeFile(join(dir, 'proposal-1.md'), proposalMd('かんりょう'));
    await start(dir);
    expect(await pendingList()).toHaveLength(1);
    expect(warnings.join('\n')).toContain('かんりょう');
  });

  it('backlogDir: null は、ファイルがあっても空', async () => {
    await writeFile(join(dir, 'proposal-1.md'), proposalMd('未着手'));
    await start(null);
    expect(await pendingList()).toEqual([]);
  });

  it('状態を「完了」に書き換えて index.html を取り直すと、一覧から外れる', async () => {
    await writeFile(join(dir, 'proposal-1.md'), proposalMd('未着手'));
    await start(dir);
    expect(await pendingList()).toHaveLength(1);

    await writeFile(join(dir, 'proposal-1.md'), proposalMd('完了'));
    // 見張っていないので、ページを開き直すまでは変わらない
    expect(await pendingList()).toHaveLength(1);
    await vite.transformIndexHtml('/', '<html></html>');
    expect(await pendingList()).toEqual([]);
  });
});
