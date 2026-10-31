import type { BodyInput } from '@cartagraph/schemas/body/parse';
import type { proposalBody } from '@cartagraph/schemas/proposals/request';
import { proposalCreatedSchema } from '@cartagraph/schemas/proposals/response';

/** POST /api/proposals の本文 */
export type ProposalRequest = BodyInput<typeof proposalBody>;

export type PostProposalResult = { ok: true; file: string } | { ok: false; message: string };

/** 提案を送る関数。画面のテストはこれを差し替える */
export type SendProposal = (request: ProposalRequest) => Promise<PostProposalResult>;

// 書いた後で応答が途切れたときは、保存済みのことがある。再送すると同じ提案のファイルが増えるので、先に確かめてもらう
const MAYBE_SAVED =
  '保存済みかもしれません。docs/backlog/ を確かめてから、もう一度提案してください';

const messageOf = (value: unknown): string | null =>
  typeof value === 'object' &&
  value !== null &&
  'message' in value &&
  typeof value.message === 'string'
    ? value.message
    : null;

// 開発サーバーの口（apps/web/vite/proposalApp.ts）へ送る。公開版には口が無い（画面が提案のカードを出さない）
export const postProposal: SendProposal = async (request) => {
  try {
    const res = await fetch(new URL('/api/proposals', window.location.origin), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    });
    const body: unknown = await res.json().catch(() => null);
    if (res.status === 201) {
      const created = proposalCreatedSchema.safeParse(body);
      if (created.success) return { ok: true, file: created.data.file };
      return { ok: false, message: `応答の形が正しくありません（${MAYBE_SAVED}）` };
    }
    return { ok: false, message: messageOf(body) ?? `状態コード ${res.status}` };
  } catch {
    return { ok: false, message: `通信に失敗しました（${MAYBE_SAVED}）` };
  }
};
