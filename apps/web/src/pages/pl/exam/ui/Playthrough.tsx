import { conversationHistory } from '@cartagraph/domain/scenario/conversation';
import {
  type DecidePlayCardReason,
  decidePlayCard,
  replay,
} from '@cartagraph/domain/scenario/events';
import type { Card, PlayEvent, Scenario } from '@cartagraph/domain/scenario/model';
import {
  awaitingProposal,
  type PendingProposal,
  PROPOSAL_TEXT_MAX_LENGTH,
  propose,
} from '@cartagraph/domain/scenario/proposal';
import { locateBeat } from '@cartagraph/domain/scenario/transition';
import { useState } from 'react';
import type { SendProposal } from '@/entities/proposal/api/postProposal';
import { ConversationBeat } from './ConversationBeat';
import type { HandProps } from './HandZone';
import { PaperBeat } from './PaperBeat';
import styles from './Playthrough.module.css';
import type { ProposalOutcome } from './ProposalForm';

type Reason = DecidePlayCardReason;

const PROPOSE_REASON_TEXT = {
  textRequired: '提案の文を書いてください。',
  textTooLong: `提案の文は${PROPOSAL_TEXT_MAX_LENGTH}文字までです。`,
  invalidEvents: '遊んだ記録が正しくありません。',
} as const;

interface Props {
  scenario: Scenario;
  /** ビルド時に読んだ、まだ終わっていない提案（virtual:proposals）。提案待ちの止めに使う */
  proposals: PendingProposal[];
  /** 提案のカードを出すか。公開版では出さない（提案待ちの止めは効く） */
  canPropose: boolean;
  sendProposal: SendProposal;
}

// シナリオを遊ぶ画面。ゲームの状態は遊んだことのイベントの列だけで、状態は replay で作る。リロードすると最初に戻る
export function Playthrough({ scenario, proposals, canPropose, sendProposal }: Props) {
  const [events, setEvents] = useState<PlayEvent[]>([]);
  // UI の状態：名前を書くために選んだカード、提案の入力欄を開いているか、断られた理由、提案を送っている間
  const [namingCard, setNamingCard] = useState<Card | null>(null);
  const [proposing, setProposing] = useState(false);
  const [sending, setSending] = useState(false);
  const [reason, setReason] = useState<Reason | null>(null);

  const current = replay(scenario, events);
  if (!current.ok)
    throw new Error(`遊んだ記録を流し直せない：${current.index} 番目 ${current.reason}`);
  const { state } = current;

  const located = locateBeat(scenario, state.beatId);
  if (!located) throw new Error(`ビートが見つからない：${state.beatId}`);
  const { scene, beat } = located;

  const awaiting = awaitingProposal({
    proposals,
    events,
    scenarioId: scenario.id,
    beatId: state.beatId,
  });

  const play = (card: Card, characterName?: string) => {
    const result = decidePlayCard(scenario, events, {
      cardId: card.id,
      ...(characterName === undefined ? {} : { characterName }),
      awaitingBeatIds: new Set(awaiting.length > 0 ? [state.beatId] : []),
    });
    if (!result.ok) {
      setReason(result.reason);
      return;
    }
    setEvents(result.events);
    setNamingCard(null);
    setProposing(false);
    setReason(null);
  };

  const submitProposal = async (rawText: string): Promise<ProposalOutcome> => {
    const result = propose(scenario, events, rawText);
    if (!result.ok) return { ok: false, message: PROPOSE_REASON_TEXT[result.reason] };
    setSending(true);
    const sent = await sendProposal({
      scenarioId: scenario.id,
      text: result.event.text,
      events,
    }).catch(() => ({ ok: false as const, message: '通信に失敗しました' }));
    setSending(false);
    if (!sent.ok) return { ok: false, message: `提案を保存できませんでした：${sent.message}` };
    setEvents(result.events);
    setProposing(false);
    return { ok: true };
  };

  const handProps: HandProps = {
    hand: beat.hand,
    namingCardId: namingCard?.id ?? null,
    reason,
    awaiting,
    busy: sending,
    proposal: canPropose
      ? {
          open: proposing,
          // 名前の入力欄とは同時に開かない
          onOpen: () => {
            setNamingCard(null);
            setReason(null);
            setProposing(true);
          },
          onCancel: () => setProposing(false),
          onSubmit: submitProposal,
        }
      : null,
    onPlay: (card) => {
      if (!card.asksCharacterName) return play(card);
      setProposing(false);
      setNamingCard(card);
    },
    onSubmitName: (name) => {
      if (namingCard) play(namingCard, name);
    },
  };

  return (
    <main className={styles.table}>
      <header className={styles.header}>
        <p className={styles.scenario}>{scenario.title}</p>
        <h1 className={styles.title}>{scene.title}</h1>
      </header>
      {beat.layout === 'paper' ? (
        <PaperBeat
          key={`${beat.id}:${state.log.length}`}
          beat={beat}
          characterName={state.characterName}
          handProps={handProps}
        />
      ) : (
        <ConversationBeat
          key={`${beat.id}:${state.log.length}`}
          beat={beat}
          npcs={scenario.npcs}
          history={conversationHistory(scenario, state)}
          characterName={state.characterName}
          handProps={handProps}
        />
      )}
    </main>
  );
}
