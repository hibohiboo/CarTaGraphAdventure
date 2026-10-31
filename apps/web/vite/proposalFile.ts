// 提案の要望ファイル（docs/backlog/proposal-<日時>.md）の中身を作る（docs/plans/2026-10-31-P6-提案の保存.md D3）。
// プレイヤーの文は、VitePress が式・HTML・リンクとして読まないように、コードブロックの中にだけ入れる。
// ssrLoadModule 経由で読む（vite.config.ts の読み込みには入れない）ので、domain の TS を import してよい。

import type { Beat, PlayEvent, Scenario, Scene } from '@cartagraph/domain/scenario/model';
import { proposalSummary, proposalTitle } from '@cartagraph/domain/scenario/proposal';

export interface ProposalFileInput {
  scenario: Scenario;
  scene: Scene;
  beat: Beat;
  /** シナリオを遊ぶ画面のパス（要望の trace の screens） */
  screen: string;
  /** 正規化した後の提案の文 */
  text: string;
  /** 新しい proposed を末尾に含む、遊んだことのイベントの列 */
  events: readonly PlayEvent[];
  now: Date;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** ローカル時刻の日付（2026-10-31） */
const dateOf = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** ローカル時刻の `proposal-` に続く部分（20261031-153012） */
export const fileStamp = (d: Date): string =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

/** 中身のいちばん長いバッククォートの並びより1つ長い（3つ以上の）フェンスで囲んだコードブロック */
const fenced = (lang: string, body: string): string => {
  const longest = Math.max(0, ...[...body.matchAll(/`+/g)].map((m) => m[0].length));
  const fence = '`'.repeat(Math.max(3, longest + 1));
  return `${fence}${lang}\n${body}\n${fence}`;
};

export const renderProposalFile = (input: ProposalFileInput): string => {
  const { scenario, scene, beat, screen, text, events, now } = input;
  const shown = text.replace(/\r\n|\r/g, '\n');
  const lines = [
    '---',
    `title: ${JSON.stringify(proposalTitle(text))}`,
    'milestone: proposal-loop',
    'status: 未着手',
    `summary: ${JSON.stringify(proposalSummary(text))}`,
    'proposal:',
    `  scenario: ${scenario.id}`,
    `  scene: ${scene.id}`,
    `  beat: ${beat.id}`,
    'trace:',
    '  usecases: [PL-2]',
    `  screens: [${screen}]`,
    `updated: ${dateOf(now)}`,
    '---',
    '',
    `# 提案（${dateOf(now)} ${pad(now.getHours())}:${pad(now.getMinutes())}）`,
    '',
    `シナリオ「${scenario.title}」のシーン「${scene.title}」、ビート \`${beat.id}\` でプレイヤーが出した提案。`,
    '',
    '## 提案',
    '',
    fenced('text', shown),
    '',
    '## そこまでに遊んだこと',
    '',
    'イベントの列（`replay` で流し直すと、このビートの状態に戻る）。',
    '',
    fenced('json', JSON.stringify(events, null, 2)),
  ];
  return `${lines.join('\n')}\n`;
};
