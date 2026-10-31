// シーンの進み方（docs/cartagraph/index.md「シーンですること」「キャラクター」）
import type { PlayState, Scenario } from './model';

export type PlayCardResult =
  | { ok: true; state: PlayState }
  | { ok: false; reason: 'unknownCard' | 'nameRequired' | 'nameTooLong' };

/** 名前の文字数の上限。文字は見た目の1文字（書記素）で数える */
export const CHARACTER_NAME_MAX_LENGTH = 10;

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/** 前後の空白を取り除いた名前を返す。決まりに合わなければ断る理由を返す */
export const normalizeCharacterName = (
  raw: string | undefined,
): { ok: true; name: string } | { ok: false; reason: 'nameRequired' | 'nameTooLong' } => {
  const name = (raw ?? '').trim();
  if (name === '') return { ok: false, reason: 'nameRequired' };
  if ([...graphemes.segment(name)].length > CHARACTER_NAME_MAX_LENGTH)
    return { ok: false, reason: 'nameTooLong' };
  return { ok: true, name };
};

export const startPlay = (scenario: Scenario): PlayState => ({
  sceneId: scenario.start,
  characterName: null,
});

export const playCard = (
  scenario: Scenario,
  state: PlayState,
  cardId: string,
  characterName?: string,
): PlayCardResult => {
  const scene = scenario.scenes.find((s) => s.id === state.sceneId);
  const card = scene?.hand.find((c) => c.id === cardId);
  if (!card) return { ok: false, reason: 'unknownCard' };
  if (card.asksCharacterName) {
    const name = normalizeCharacterName(characterName);
    if (!name.ok) return name;
    return { ok: true, state: { sceneId: card.next, characterName: name.name } };
  }
  return { ok: true, state: { sceneId: card.next, characterName: state.characterName } };
};
