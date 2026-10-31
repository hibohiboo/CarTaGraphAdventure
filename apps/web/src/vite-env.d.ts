/// <reference types="vite/client" />

// vite/proposals.ts のプラグインが出す、まだ終わっていない提案の一覧（docs/plans/2026-10-31-P6-提案の保存.md D5）
declare module 'virtual:proposals' {
  import type { PendingProposal } from '@cartagraph/domain/scenario/proposal';

  const proposals: PendingProposal[];
  export default proposals;
}
