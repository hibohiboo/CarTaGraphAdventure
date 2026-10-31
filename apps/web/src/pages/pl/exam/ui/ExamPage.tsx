import { adventurerExam } from '@cartagraph/domain/scenario/adventurer-exam';
import type { Card, PlayState } from '@cartagraph/domain/scenario/model';
import { renderText } from '@cartagraph/domain/scenario/text';
import { type PlayCardResult, playCard, startPlay } from '@cartagraph/domain/scenario/transition';
import { useState } from 'react';
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
    <main>
      <h1>{scene.title}</h1>
      {scene.text.map((paragraph) => (
        <p key={paragraph}>{renderText(paragraph, state)}</p>
      ))}
      {scene.hand.length === 0 ? (
        <p>続きは準備中です。</p>
      ) : (
        <ul aria-label="手札">
          {scene.hand.map((card) => (
            <li key={card.id}>
              <button
                type="button"
                onClick={() => (card.asksCharacterName ? setNamingCard(card) : play(card))}
              >
                <strong>{card.title}</strong> {card.text}
              </button>
            </li>
          ))}
        </ul>
      )}
      {namingCard && <NameForm reason={reason} onSubmit={(name) => play(namingCard, name)} />}
      <p>GM への提案は準備中です（仮）</p>
    </main>
  );
}
