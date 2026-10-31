import { adventurerExam } from '@cartagraph/domain/scenario/adventurer-exam';
import type { Card, PlayState } from '@cartagraph/domain/scenario/model';
import { renderText } from '@cartagraph/domain/scenario/text';
import { type PlayCardResult, playCard, startPlay } from '@cartagraph/domain/scenario/transition';
import { useState } from 'react';
import styles from './ExamPage.module.css';
import { HandCard } from './HandCard';
import { NameForm } from './NameForm';

type Reason = Extract<PlayCardResult, { ok: false }>['reason'];

// 冒険者登録の試験のシーン。ゲームの状態は PlayState だけで、リロードすると最初に戻る
export function ExamPage() {
  const [state, setState] = useState<PlayState>(() => startPlay(adventurerExam));
  // UI の状態：名前を書くために選んだカードと、断られた理由
  const [namingCard, setNamingCard] = useState<Card | null>(null);
  const [reason, setReason] = useState<Reason | null>(null);

  const scene = adventurerExam.scenes.find((s) => s.id === state.sceneId);
  if (!scene) throw new Error(`シーンが見つからない：${state.sceneId}`);

  const play = (card: Card, characterName?: string) => {
    const result = playCard(adventurerExam, state, card.id, characterName);
    if (!result.ok) {
      setReason(result.reason);
      return;
    }
    setState(result.state);
    setNamingCard(null);
    setReason(null);
  };

  return (
    <main className={styles.table}>
      <header className={styles.header}>
        <p className={styles.scenario}>{adventurerExam.title}</p>
        <h1 className={styles.title}>{scene.title}</h1>
      </header>
      {/* key でシーンが変わるたびに描き直し、紙面を差し替えたように見せる */}
      <section key={scene.id} className={styles.narration} aria-label="シーン">
        {scene.text.map((paragraph) => (
          <p key={paragraph}>{renderText(paragraph, state)}</p>
        ))}
      </section>
      <section className={styles.handZone} aria-label="手札">
        <h2 className={styles.zoneLabel}>手札</h2>
        {scene.hand.length === 0 && <p className={styles.toBeContinued}>続きは準備中です。</p>}
        <ul className={styles.hand}>
          {scene.hand.map((card) => (
            <li key={card.id}>
              <HandCard
                card={card}
                selected={namingCard?.id === card.id}
                onPlay={() => (card.asksCharacterName ? setNamingCard(card) : play(card))}
              />
            </li>
          ))}
          {/* 仮：提案の保存（playable-scene の別の要望）と、未解決論点「公開版での提案」が決まるまで、提案のボタンを出さない。
              見た目だけ、提案のカードの形（点線の枠）で置く */}
          <li className={styles.proposal}>
            <span className={styles.proposalMark} aria-hidden="true">
              ＋
            </span>
            <p>GM への提案は準備中です（仮）</p>
          </li>
        </ul>
      </section>
      {namingCard && <NameForm reason={reason} onSubmit={(name) => play(namingCard, name)} />}
    </main>
  );
}
