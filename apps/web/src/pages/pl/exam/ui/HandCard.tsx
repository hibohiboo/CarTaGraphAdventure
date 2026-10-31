import type { Card } from '@cartagraph/domain/scenario/model';
import styles from './HandCard.module.css';

interface Props {
  card: Card;
  /** 名前を書くために選んでいるカード */
  selected: boolean;
  /** 提案待ち・提案を送っている間は出せない */
  disabled: boolean;
  onPlay: () => void;
}

// 手札のカード1枚（縦横比 5:7。docs/architecture/web-app.md「デザインシステム」）
export function HandCard({ card, selected, disabled, onPlay }: Props) {
  return (
    <button
      type="button"
      className={styles.card}
      data-selected={selected}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onPlay}
    >
      <span className={styles.title}>{card.title}</span>
      <span className={styles.text}>{card.text}</span>
    </button>
  );
}
