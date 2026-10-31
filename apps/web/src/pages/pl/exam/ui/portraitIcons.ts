import type { IconType } from 'react-icons';
import { GiBookCover } from 'react-icons/gi';

// シナリオの portrait.name から引く登録表。使うアイコンだけを import する（gi は全アイコンが1つのモジュールにある）
export const portraitIcons: Record<string, IconType> = {
  GiBookCover,
};
