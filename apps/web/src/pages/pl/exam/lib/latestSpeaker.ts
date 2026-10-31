import type { DialogueLine } from '@cartagraph/domain/scenario/model';

/** 台詞を revealed 個まで読んだとき、直近に話した人（NPC の id）。revealed は 1 以上、行数以下 */
export const latestSpeaker = (lines: DialogueLine[], revealed: number): string => {
  const line = lines[revealed - 1];
  if (revealed < 1 || !line) throw new Error(`読んだ台詞の数が範囲の外：${revealed}`);
  return line.speaker;
};
