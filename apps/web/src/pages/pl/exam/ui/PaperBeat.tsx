import type { Beat, PlayState } from '@cartagraph/domain/scenario/model';
import { renderText } from '@cartagraph/domain/scenario/text';
import { type HandProps, HandZone } from './HandZone';
import styles from './PaperBeat.module.css';

interface Props {
  beat: Extract<Beat, { layout: 'paper' }>;
  characterName: PlayState['characterName'];
  handProps: HandProps;
}

// 紙面のビート：地の文の段落と手札
export function PaperBeat({ beat, characterName, handProps }: Props) {
  return (
    <>
      {/* key でビートが変わるたびに描き直し、紙面を差し替えたように見せる。段落の key は位置 */}
      <section key={beat.id} className={styles.narration} aria-label="地の文">
        {beat.text.map((paragraph, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: 段落は並べ替えず、同じ文が2つあっても key がぶつからない位置を使う
          <p key={i}>{renderText(paragraph, { characterName })}</p>
        ))}
      </section>
      <HandZone {...handProps} />
    </>
  );
}
