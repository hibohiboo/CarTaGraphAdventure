// シーンの文の差し込み。{characterName} をキャラクターの名前に置き換える（ほかの {…} には触れない）
import type { PlayState } from './model';

const CHARACTER_NAME = '{characterName}';

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/** 文字数を見た目の1文字（書記素）で数える */
export const countGraphemes = (text: string): number => [...graphemes.segment(text)].length;

/** 先頭から max 書記素までに切る（書記素の途中では切らない） */
export const truncateGraphemes = (
  text: string,
  max: number,
): { text: string; truncated: boolean } => {
  const segments = [...graphemes.segment(text)];
  if (segments.length <= max) return { text, truncated: false };
  return {
    text: segments
      .slice(0, max)
      .map((s) => s.segment)
      .join(''),
    truncated: true,
  };
};

export const renderText = (text: string, state: Pick<PlayState, 'characterName'>): string => {
  const name = state.characterName;
  if (name === null) return text;
  // 関数を渡して、名前の中の $& などを置換の特殊パターンとして解釈させない
  return text.replaceAll(CHARACTER_NAME, () => name);
};
