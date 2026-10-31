import { conversationHistory } from '@cartagraph/domain/scenario/conversation';
import type { Card, PlayState, Scenario } from '@cartagraph/domain/scenario/model';
import {
  locateBeat,
  type PlayCardResult,
  playCard,
  startPlay,
} from '@cartagraph/domain/scenario/transition';
import { useState } from 'react';
import { ConversationBeat } from './ConversationBeat';
import type { HandProps } from './HandZone';
import { PaperBeat } from './PaperBeat';
import styles from './Playthrough.module.css';

type Reason = Extract<PlayCardResult, { ok: false }>['reason'];

// シナリオを遊ぶ画面。ゲームの状態は PlayState だけで、リロードすると最初に戻る
export function Playthrough({ scenario }: { scenario: Scenario }) {
  const [state, setState] = useState<PlayState>(() => startPlay(scenario));
  // UI の状態：名前を書くために選んだカードと、断られた理由
  const [namingCard, setNamingCard] = useState<Card | null>(null);
  const [reason, setReason] = useState<Reason | null>(null);

  const located = locateBeat(scenario, state.beatId);
  if (!located) throw new Error(`ビートが見つからない：${state.beatId}`);
  const { scene, beat } = located;

  const play = (card: Card, characterName?: string) => {
    const result = playCard(scenario, state, card.id, characterName);
    if (!result.ok) {
      setReason(result.reason);
      return;
    }
    setState(result.state);
    setNamingCard(null);
    setReason(null);
  };

  const handProps: HandProps = {
    hand: beat.hand,
    namingCardId: namingCard?.id ?? null,
    reason,
    onPlay: (card) => (card.asksCharacterName ? setNamingCard(card) : play(card)),
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
