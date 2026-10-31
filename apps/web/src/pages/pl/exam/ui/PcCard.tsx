import { GiHoodedFigure } from 'react-icons/gi';
import styles from './PcCard.module.css';

const NOT_NAMED = '（まだ名乗っていない）';

// 自分のキャラクターのカード。名前だけ（絵は名前を持つ前も後も共通のシルエット）
export function PcCard({ characterName }: { characterName: string | null }) {
  return (
    <section className={styles.card} aria-label="自分のキャラクター">
      <span className={styles.silhouette}>
        <GiHoodedFigure aria-hidden="true" />
      </span>
      <p className={styles.name}>{characterName ?? NOT_NAMED}</p>
    </section>
  );
}
