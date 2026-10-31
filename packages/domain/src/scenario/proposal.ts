// 提案の決まり（docs/cartagraph/index.md「提案」）
import { type DecideResult, replay } from './events';
import type { PlayEvent, Scenario } from './model';
import { countGraphemes, truncateGraphemes } from './text';

/** 提案の文の文字数の上限。文字は見た目の1文字（書記素）で数える */
export const PROPOSAL_TEXT_MAX_LENGTH = 4000;

const TITLE_MAX_LENGTH = 30;
const SUMMARY_MAX_LENGTH = 100;

/** 前後の空白を取り除いた提案の文を返す。決まりに合わなければ断る理由を返す */
export const normalizeProposalText = (
  raw: string,
): { ok: true; text: string } | { ok: false; reason: 'textRequired' | 'textTooLong' } => {
  const text = raw.trim();
  if (text === '') return { ok: false, reason: 'textRequired' };
  if (countGraphemes(text) > PROPOSAL_TEXT_MAX_LENGTH) return { ok: false, reason: 'textTooLong' };
  return { ok: true, text };
};

type ProposedEvent = Extract<PlayEvent, { type: 'proposed' }>;

/** 提案する。replay の終わりのビートで proposed を足す */
export const propose = (
  scenario: Scenario,
  events: readonly PlayEvent[],
  rawText: string,
): DecideResult<'textRequired' | 'textTooLong' | 'invalidEvents', ProposedEvent> => {
  const current = replay(scenario, events);
  if (!current.ok) return { ok: false, reason: 'invalidEvents' };
  // 前の提案の文も、いまの決まりに合っているものだけ（列の経由で、4000文字の決まりを素通りさせない）
  const earlierOk = events.every((e) => {
    if (e.type !== 'proposed') return true;
    const earlier = normalizeProposalText(e.text);
    return earlier.ok && earlier.text === e.text;
  });
  if (!earlierOk) return { ok: false, reason: 'invalidEvents' };
  const normalized = normalizeProposalText(rawText);
  if (!normalized.ok) return { ok: false, reason: normalized.reason };
  const event: ProposedEvent = {
    type: 'proposed',
    beatId: current.state.beatId,
    text: normalized.text,
  };
  return { ok: true, events: [...events, event], event };
};

// YAML の二重引用符の中でエスケープが要らなくなるように、全角に置き換える
// 制御文字（タブなど）は JSON.stringify が \t のように書き、読み手によって値が変わるので、空白にする
// < と > も全角にする：VitePress はページの frontmatter を <script> の中に埋め込むので、
// 文に </script> があると Vue のコンパイルが落ちる
const yamlSafe = (text: string): string =>
  text
    .replaceAll('"', '＂')
    .replaceAll('\\', '＼')
    .replaceAll('<', '＜')
    .replaceAll('>', '＞')
    // 行の区切りの U+2028・U+2029 と、対の無いサロゲートも、YAML で読めなくなるので空白にする
    .replace(/\p{Cc}|\u2028|\u2029|\p{Cs}/gu, ' ');

const shorten = (text: string, max: number): string => {
  const cut = truncateGraphemes(text, max);
  return cut.truncated ? `${cut.text}…` : cut.text;
};

/** 要望の題。「提案：」＋1行目の先頭30文字 */
export const proposalTitle = (text: string): string => {
  const firstLine = text.split(/\r\n|\r|\n/)[0] ?? '';
  return yamlSafe(`提案：${shorten(firstLine, TITLE_MAX_LENGTH)}`);
};

/** 要望の要約・提案待ちの一覧に出す文。先頭100文字で、改行は空白1つ */
export const proposalSummary = (text: string): string =>
  yamlSafe(shorten(text.replace(/\r\n|\r|\n/g, ' '), SUMMARY_MAX_LENGTH));

/** ビルド時に読んだ、まだ終わっていない提案 */
export type PendingProposal = { scenarioId: string; beatId: string; summary: string };

/** そのビートの提案待ちの文の一覧。空なら提案待ちではない */
export const awaitingProposal = (input: {
  proposals: readonly PendingProposal[];
  events: readonly PlayEvent[];
  scenarioId: string;
  beatId: string;
}): string[] => [
  ...input.proposals
    .filter((p) => p.scenarioId === input.scenarioId && p.beatId === input.beatId)
    .map((p) => p.summary),
  ...input.events.flatMap((e) =>
    e.type === 'proposed' && e.beatId === input.beatId ? [proposalSummary(e.text)] : [],
  ),
];
