import type { Npc } from '@cartagraph/domain/scenario/model';
import styles from './NpcCard.module.css';
import { Portrait } from './Portrait';

// 会話の上に出す、話している NPC の横長の帯（絵・名前・肩書とひとこと）
export function NpcCard({ npc }: { npc: Npc }) {
  return (
    <section className={styles.band} aria-label="話している相手">
      <Portrait portrait={npc.portrait} alt={npc.name} />
      <div className={styles.text}>
        <p className={styles.name}>
          {npc.name}
          <span className={styles.title}>{npc.title}</span>
        </p>
        <p className={styles.description}>{npc.description}</p>
      </div>
    </section>
  );
}
