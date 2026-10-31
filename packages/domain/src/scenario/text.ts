// シーンの文の差し込み。{characterName} をキャラクターの名前に置き換える（ほかの {…} には触れない）
import type { PlayState } from './model';

const CHARACTER_NAME = '{characterName}';

export const renderText = (text: string, state: PlayState): string => {
  const name = state.characterName;
  if (name === null) return text;
  // 関数を渡して、名前の中の $& などを置換の特殊パターンとして解釈させない
  return text.replaceAll(CHARACTER_NAME, () => name);
};
