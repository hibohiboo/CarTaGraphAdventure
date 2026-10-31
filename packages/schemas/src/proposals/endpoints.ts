// /proposals の API の一覧（docs/plans/2026-10-31-P6-提案の保存.md D7）

import { defineEndpoint, failure, success } from '../endpoint/define';
import { proposalBody } from './request';
import { proposalCreatedSchema } from './response';

export const proposalEndpoints = [
  defineEndpoint({
    method: 'post',
    path: '/proposals',
    summary: 'GM へ提案する',
    description:
      '提案の文と、そこまでに遊んだことのイベントの列を、要望のファイル（docs/backlog/proposal-<日時>.md）に書く。開発サーバーだけにある',
    body: proposalBody,
    responses: {
      201: success('要望のファイルを書いた', proposalCreatedSchema),
      403: failure('ループバックかプライベートの LAN 以外からの要求、または Origin が Host と違う'),
      422: failure('本文の形・提案の文・イベントの列・シナリオの id が正しくない'),
      500: failure('ファイルを書けなかった'),
    },
  }),
];
