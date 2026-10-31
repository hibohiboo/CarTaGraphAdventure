// イベントの列の流し直しと、手札を出す命令（docs/architecture/aggregates.md 集約「プレイ」）
import type { PlayEvent, PlayState, Scenario } from './model';
import { locateBeat, type PlayCardFailure, playCard, startPlay } from './transition';

export type ReplayResult =
  | { ok: true; state: PlayState }
  | { ok: false; index: number; reason: 'beatMismatch' | PlayCardFailure };

/**
 * 列を startPlay から順に畳み込み、遊んだ後の状態に戻す。proposed は状態を変えない。
 * 過去のイベントはその時に出せたものなので、提案待ちは見ない
 */
export const replay = (scenario: Scenario, events: readonly PlayEvent[]): ReplayResult => {
  let state = startPlay(scenario);
  for (const [index, event] of events.entries()) {
    if (event.beatId !== state.beatId) return { ok: false, index, reason: 'beatMismatch' };
    if (event.type === 'proposed') continue;
    const played = playCard(scenario, state, event.cardId, event.characterName);
    if (!played.ok) return { ok: false, index, reason: played.reason };
    state = played.state;
  }
  return { ok: true, state };
};

/** 命令の結果。成功なら、イベントを足した列と、足したイベント */
export type DecideResult<Reason extends string, Added extends PlayEvent = PlayEvent> =
  | { ok: true; events: PlayEvent[]; event: Added }
  | { ok: false; reason: Reason };

export type DecidePlayCardReason = PlayCardFailure | 'awaitingProposal' | 'invalidEvents';

/** 手札を出す。今のビートが提案待ちなら断る（PL-1 の「提案待ちのビートでは出せない」） */
export const decidePlayCard = (
  scenario: Scenario,
  events: readonly PlayEvent[],
  input: { cardId: string; characterName?: string; awaitingBeatIds?: ReadonlySet<string> },
): DecideResult<DecidePlayCardReason> => {
  const current = replay(scenario, events);
  if (!current.ok) return { ok: false, reason: 'invalidEvents' };
  const { beatId } = current.state;
  if (input.awaitingBeatIds?.has(beatId)) return { ok: false, reason: 'awaitingProposal' };
  const played = playCard(scenario, current.state, input.cardId, input.characterName);
  if (!played.ok) return { ok: false, reason: played.reason };
  // 名前は名前を書くカードのときだけ入る（正規化した後の名前）
  const asksName = locateBeat(scenario, beatId)?.beat.hand.find(
    (c) => c.id === input.cardId,
  )?.asksCharacterName;
  const event: PlayEvent = {
    type: 'cardPlayed',
    beatId,
    cardId: input.cardId,
    ...(asksName && played.state.characterName !== null
      ? { characterName: played.state.characterName }
      : {}),
  };
  return { ok: true, events: [...events, event], event };
};
