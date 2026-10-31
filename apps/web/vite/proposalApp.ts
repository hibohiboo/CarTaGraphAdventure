// 提案を要望のファイルに書く開発サーバーの口（docs/plans/2026-10-31-P6-提案の保存.md D4）。
// Hono のアプリで、Vite プラグイン（proposals.ts）が開発サーバーにつなぐ。ssrLoadModule 経由で読むので、
// domain・schemas の TS を import してよい（vite.config.ts の読み込みには入れない）。

import { writeFile } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { adventurerExam } from '@cartagraph/domain/scenario/adventurer-exam';
import type { Scenario } from '@cartagraph/domain/scenario/model';
import { PROPOSAL_TEXT_MAX_LENGTH, propose } from '@cartagraph/domain/scenario/proposal';
import { locateBeat } from '@cartagraph/domain/scenario/transition';
import { safeParseBodyText } from '@cartagraph/schemas/body/parse';
import { proposalBody } from '@cartagraph/schemas/proposals/request';
import { getConnInfo } from '@hono/node-server/conninfo';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { createMiddleware } from 'hono/factory';
import { fileStamp, renderProposalFile } from './proposalFile';

/** 本文の大きさの上限。4000書記素の文は、重い書記素（ZWJ の絵文字など）でもこれに収まる */
export const BODY_MAX_BYTES = 1024 * 1024;
/** 同じ秒に作れるファイルの数の上限。超えたら誤り */
const MAX_FILES_PER_SECOND = 100;

/** シナリオの id から、シナリオと、それを遊ぶ画面のパスを引く表 */
const SCENARIOS: Record<string, { scenario: Scenario; screen: string }> = {
  [adventurerExam.id]: { scenario: adventurerExam, screen: '/exam' },
};

const REASON_MESSAGE = {
  textRequired: '提案の文を書いてください',
  textTooLong: `提案の文は${PROPOSAL_TEXT_MAX_LENGTH}文字までです`,
  invalidEvents: 'イベントの列が正しくありません',
} as const;

/** ループバック（127.0.0.0/8・::1）かプライベートの IPv4（10/8・172.16/12・192.168/16。::ffff: 付きも） */
export const isAllowedAddress = (address: string | undefined): boolean => {
  if (address === undefined) return false;
  const addr = address.toLowerCase().replace(/^::ffff:/, '');
  if (addr === '::1') return true;
  const m = addr.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b, c, d] = m.slice(1).map(Number) as [number, number, number, number];
  if ([a, b, c, d].some((n) => n > 255)) return false;
  return a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
};

const remoteAddressOf = (c: Parameters<typeof getConnInfo>[0]): string | undefined => {
  try {
    return getConnInfo(c).remote.address;
  } catch {
    // 本物の接続の無い呼び出し（env が無い）
    return undefined;
  }
};

/** Origin があれば、その host（ポートを含む）が Host と同じか。無ければ通す */
export const isSameOrigin = (origin: string | undefined, host: string | undefined): boolean => {
  if (origin === undefined) return true;
  if (host === undefined) return false;
  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
};

/** 要望のファイルを、同じ名前があれば -2, -3 … を付けて書く。書いたファイル名を返す */
const writeNew = async (dir: string, stamp: string, content: string): Promise<string> => {
  for (let n = 1; n <= MAX_FILES_PER_SECOND; n++) {
    const name = `proposal-${stamp}${n === 1 ? '' : `-${n}`}.md`;
    try {
      await writeFile(join(dir, name), content, { encoding: 'utf8', flag: 'wx' });
      return name;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
    }
  }
  throw new Error(`同じ秒の提案が ${MAX_FILES_PER_SECOND} 件を超えた`);
};

export interface ProposalAppOptions {
  /** 要望のファイルを書く先（既定ではリポジトリの docs/backlog/） */
  backlogDir: string;
  now?: () => Date;
}

export const createProposalApp = ({ backlogDir, now = () => new Date() }: ProposalAppOptions) => {
  const checkSender = createMiddleware(async (c, next) => {
    if (!isAllowedAddress(remoteAddressOf(c))) {
      return c.json({ message: 'この接続元からは提案できません' }, 403);
    }
    await next();
  });

  const checkOrigin = createMiddleware(async (c, next) => {
    // Vite の cors は応答のヘッダーを付けるだけで、text/plain の単純リクエストは口に届く。
    // よそのページを開いているブラウザ経由で書かれないための守り
    if (!isSameOrigin(c.req.header('origin'), c.req.header('host'))) {
      return c.json({ message: 'この Origin からは提案できません' }, 403);
    }
    await next();
  });

  const limitBody = bodyLimit({
    maxSize: BODY_MAX_BYTES,
    onError: (c) => c.json({ message: '本文が大きすぎます' }, 422),
  });

  const app = new Hono().basePath('/api');

  app.post('/proposals', checkSender, checkOrigin, limitBody, async (c) => {
    const parsed = safeParseBodyText(proposalBody, await c.req.text());
    if (!parsed.ok) return c.json({ message: parsed.message }, 422);
    const { scenarioId, text, events } = parsed.data;

    const entry = Object.hasOwn(SCENARIOS, scenarioId) ? SCENARIOS[scenarioId] : undefined;
    if (!entry) return c.json({ message: `シナリオ ${scenarioId} が見つかりません` }, 422);

    const result = propose(entry.scenario, events, text);
    if (!result.ok) return c.json({ message: REASON_MESSAGE[result.reason] }, 422);

    const located = locateBeat(entry.scenario, result.event.beatId);
    if (!located) return c.json({ message: REASON_MESSAGE.invalidEvents }, 422);

    const at = now();
    const content = renderProposalFile({
      scenario: entry.scenario,
      scene: located.scene,
      beat: located.beat,
      screen: entry.screen,
      text: result.event.text,
      events: result.events,
      now: at,
    });
    const name = await writeNew(backlogDir, fileStamp(at), content);
    const file = relative(dirname(dirname(backlogDir)), join(backlogDir, name))
      .split(sep)
      .join('/');
    return c.json({ file }, 201);
  });

  app.notFound((c) => c.json({ message: '見つかりません' }, 404));
  app.onError((_, c) => c.json({ message: '要望のファイルを書けませんでした' }, 500));
  return app;
};
