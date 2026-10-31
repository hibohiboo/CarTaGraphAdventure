import type { Card } from '@cartagraph/domain/scenario/model';
import { HandCard } from './HandCard';
import styles from './HandZone.module.css';
import { NameForm } from './NameForm';

export interface HandProps {
  hand: Card[];
  /** 名前を書くために選んでいるカードの id */
  namingCardId: string | null;
  /** 断られた理由 */
  reason: Parameters<typeof NameForm>[0]['reason'];
  onPlay: (card: Card) => void;
  onSubmitName: (name: string) => void;
}

// 手札の置き場。紙面・会話のどちらのビートからも使う。会話で台詞を読んでいる間は、手札を隠して提案の仮の表示だけを出す
export function HandZone({
  hand,
  namingCardId,
  reason,
  onPlay,
  onSubmitName,
  showHand = true,
}: HandProps & { showHand?: boolean }) {
  return (
    <>
      {showHand && namingCardId !== null && <NameForm reason={reason} onSubmit={onSubmitName} />}
      <section className={styles.handZone} aria-label="手札">
        <h2 className={styles.zoneLabel}>手札</h2>
        {showHand && hand.length === 0 && (
          <p className={styles.toBeContinued}>続きは準備中です。</p>
        )}
        <ul className={styles.hand}>
          {showHand &&
            hand.map((card) => (
              <li key={card.id}>
                <HandCard
                  card={card}
                  selected={namingCardId === card.id}
                  onPlay={() => onPlay(card)}
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
    </>
  );
}
