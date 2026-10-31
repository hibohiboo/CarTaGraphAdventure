import type { Portrait as PortraitData } from '@cartagraph/domain/scenario/model';
import styles from './Portrait.module.css';
import { portraitIcons } from './portraitIcons';

interface Props {
  portrait: PortraitData;
  /** 画像の代替テキスト（NPC の名前） */
  alt: string;
}

// NPC の絵。アイコンは登録表から、画像は src から。登録表に無い名前はシナリオの誤りなので例外にする
export function Portrait({ portrait, alt }: Props) {
  if (portrait.type === 'image')
    return <img className={styles.portrait} src={portrait.src} alt={alt} />;
  const Icon = portraitIcons[portrait.name];
  if (!Icon) throw new Error(`登録表に無いアイコン：${portrait.name}`);
  return (
    <span className={styles.portrait}>
      <Icon aria-hidden="true" />
    </span>
  );
}
