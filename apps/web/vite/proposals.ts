// 提案の口（proposalApp.ts の Hono のアプリ）を開発サーバーにつなぎ、提案待ちの一覧を仮想モジュール
// `virtual:proposals` で出す Vite プラグイン（docs/plans/2026-10-31-P6-提案の保存.md D4・D5）。
// vite.config.ts が読み込むので、Node が解決できない import をしない。Hono のアプリは server.ssrLoadModule で読む
// （Vite の変換を通すので、domain・schemas の TS を import できる）。

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { PendingProposal } from '@cartagraph/domain/scenario/proposal';
import { getRequestListener } from '@hono/node-server';
import type { Plugin, ViteDevServer } from 'vite';
import { parseProposalFile } from '../../../scripts/trace.mjs';
import type { createProposalApp } from './proposalApp.ts';

/** 既定の書く先・読む先（リポジトリの docs/backlog/） */
const DEFAULT_BACKLOG_DIR = fileURLToPath(new URL('../../../docs/backlog', import.meta.url));

const VIRTUAL_ID = 'virtual:proposals';
const RESOLVED_ID = `\0${VIRTUAL_ID}`;
const APP_MODULE = '/vite/proposalApp.ts';

/** 提案待ちを外す状態 */
const DONE_STATUSES = ['完了', '見送り'];
/** 要望の状態の一覧（docs/backlog/index.md）。これに無い綴りは未完了として扱い、警告を出す */
const KNOWN_STATUSES = ['未着手', '検討中', '進行中', '判断待ち', ...DONE_STATUSES];

export interface ProposalsPluginOptions {
  /**
   * 要望のファイルを書く先と読む先。省くとリポジトリの docs/backlog/。
   * null は、提案待ちの一覧を空にする（Vitest と E2E のビルドが、実物の要望に左右されないように）
   */
  backlogDir?: string | null;
}

/** 書く先の要望のうち、提案のファイルで、まだ終わっていないもの */
const readPending = (dir: string, warn: (message: string) => void): PendingProposal[] => {
  let names: string[];
  try {
    names = readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'index.md');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
  return names.sort().flatMap((name) => {
    let source: string;
    try {
      source = readFileSync(`${dir}/${name}`, 'utf8');
    } catch {
      // 1件を読めないだけで、ページ全体を落とさない
      warn(`${name} を読めない。提案待ちに数えない`);
      return [];
    }
    const proposal = parseProposalFile(source);
    if (!proposal || DONE_STATUSES.includes(proposal.status)) return [];
    if (!KNOWN_STATUSES.includes(proposal.status)) {
      warn(`${name} の状態「${proposal.status}」は要望の状態の一覧に無い。未完了として扱う`);
    }
    return [{ scenarioId: proposal.scenario, beatId: proposal.beat, summary: proposal.summary }];
  });
};

export const proposals = ({ backlogDir }: ProposalsPluginOptions = {}): Plugin => {
  const writeDir = backlogDir ?? DEFAULT_BACKLOG_DIR;
  let devServer: ViteDevServer | undefined;

  return {
    name: 'cartagraph:proposals',

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      return undefined;
    },

    load(id) {
      if (id !== RESOLVED_ID) return undefined;
      const pending = backlogDir === null ? [] : readPending(writeDir, (m) => this.warn(m));
      return `export default ${JSON.stringify(pending)};`;
    },

    // 開発サーバーでは、ページを開き直すたびに読み直す。docs/backlog/ の変更は見張らない
    // （口が書いたファイルでページが読み直され、遊んだことが消えないように）
    transformIndexHtml() {
      const graph = devServer?.environments.client.moduleGraph;
      const mod = graph?.getModuleById(RESOLVED_ID);
      if (graph && mod) graph.invalidateModule(mod);
      return undefined;
    },

    configureServer(server) {
      devServer = server;
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        try {
          const mod = await server.ssrLoadModule(APP_MODULE);
          const app = (mod.createProposalApp as typeof createProposalApp)({ backlogDir: writeDir });
          await getRequestListener(app.fetch)(req, res);
        } catch {
          // 応答を書き始めた後の誤りは、ヘッダーを書き直せない
          if (res.headersSent) return res.end();
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ message: '提案の口を読み込めませんでした' }));
        }
      });
    },
  };
};
