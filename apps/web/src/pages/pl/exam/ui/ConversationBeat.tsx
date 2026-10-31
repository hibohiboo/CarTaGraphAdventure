import {
  type Beat,
  type LogEntry,
  type Npc,
  PLAYER_SPEAKER,
  type PlayState,
} from '@cartagraph/domain/scenario/model';
import { renderText } from '@cartagraph/domain/scenario/text';
import { useEffect, useRef, useState } from 'react';
import { latestSpeaker } from '../lib/latestSpeaker';
import styles from './ConversationBeat.module.css';
import { type HandProps, HandZone } from './HandZone';
import { NpcCard } from './NpcCard';
import { PcCard } from './PcCard';

interface Props {
  beat: Extract<Beat, { layout: 'conversation' }>;
  npcs: Npc[];
  /** 同じシーンで、これまでに会話のビートで出た行（conversationHistory の結果） */
  history: LogEntry[];
  characterName: PlayState['characterName'];
  handProps: HandProps;
}

// 会話のビート：上に NPC の帯、真ん中に会話、下に自分のカードと手札。台詞は「次へ」で1つずつ出す。
// 送り位置はこの部品の状態。親が key={beat.id} を付けて描くので、ビートが変わると最初に戻る
export function ConversationBeat({ beat, npcs, history, characterName, handProps }: Props) {
  const [revealed, setRevealed] = useState(1);
  const logRef = useRef<HTMLDivElement>(null);
  const finished = revealed >= beat.lines.length;

  // 新しい台詞が出たら（入った時と「次へ」のたび）下までスクロールする
  // biome-ignore lint/correctness/useExhaustiveDependencies: 送り位置が変わるたびに動かすため revealed を依存に置く
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [revealed]);

  const speakerId = latestSpeaker(beat.lines, revealed);
  // このビートに出る NPC を、出てくる順に並べる。直近に話した人のカードが光る
  const participants = [...new Set(beat.lines.map((line) => line.speaker))].map((id) => {
    const npc = npcs.find((n) => n.id === id);
    if (!npc) throw new Error(`NPC が見つからない：${id}`);
    return npc;
  });

  const rows = [...history, ...beat.lines.slice(0, revealed).map((line) => ({ ...line }))];

  return (
    <div className={styles.conversation}>
      <div className={styles.npcs}>
        {participants.map((npc) => (
          <NpcCard key={npc.id} npc={npc} active={npc.id === speakerId} />
        ))}
      </div>
      <div ref={logRef} className={styles.log} role="log" aria-label="会話">
        {rows.map((row, i) => (
          <p
            // biome-ignore lint/suspicious/noArrayIndexKey: 台詞は並べ替えず、同じ文が2つあっても key がぶつからない位置を使う
            key={i}
            className={styles.bubble}
            data-side={row.speaker === PLAYER_SPEAKER ? 'right' : 'left'}
          >
            {renderText(row.text, { characterName })}
          </p>
        ))}
      </div>
      {!finished && (
        <button type="button" className={styles.next} onClick={() => setRevealed(revealed + 1)}>
          次へ
        </button>
      )}
      <HandZone {...handProps} showHand={finished} />
      <div className={styles.pc}>
        <PcCard characterName={characterName} />
      </div>
    </div>
  );
}
