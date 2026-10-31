import type { Npc } from '@cartagraph/domain/scenario/model';
import styles from './CharacterCard.module.css';
import { Portrait } from './Portrait';

interface Props {
  npc: Npc;
  /** 直近に話した人か */
  active: boolean;
}

// 会話に出る NPC の縦長のカード（絵・名前・肩書・ひとこと）。直近に話した人は枠が光る
export function NpcCard({ npc, active }: Props) {
  return (
    <article
      className={styles.card}
      aria-label={npc.name}
      aria-current={active}
      data-active={active}
    >
      <Portrait portrait={npc.portrait} alt={npc.name} />
      <p className={styles.name}>{npc.name}</p>
      <p className={styles.title}>{npc.title}</p>
      <p className={styles.description}>{npc.description}</p>
    </article>
  );
}
