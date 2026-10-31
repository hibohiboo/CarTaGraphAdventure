import type { Card } from '@cartagraph/domain/scenario/model';
import styles from './HandCard.module.css';

interface Props {
  card: Card;
  /** 名前を書くために選んでいるカード */
  selected: boolean;
  onPlay: () => void;
}

// 手札のカード1枚（縦横比 5:7。docs/architecture/web-app.md「デザインシステム」）
export function HandCard({ card, selected, onPlay }: Props) {
  return (
    <button
      type="button"
      className={styles.card}
      data-selected={selected}
      aria-pressed={selected}
      onClick={onPlay}
    >
      <span className={styles.title}>{card.title}</span>
      <span className={styles.text}>{card.text}</span>
    </button>
  );
}
