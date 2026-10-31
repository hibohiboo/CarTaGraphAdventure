// ビートの進み方と、ビートの引き当て（docs/cartagraph/index.md「シーンですること」「キャラクター」）
import {
  type Beat,
  type LogEntry,
  PLAYER_SPEAKER,
  type PlayState,
  type Scenario,
  type Scene,
} from './model';
import { countGraphemes } from './text';

export type PlayCardFailure = 'unknownCard' | 'nameRequired' | 'nameTooLong';

export type PlayCardResult =
  | { ok: true; state: PlayState }
  | { ok: false; reason: PlayCardFailure };

/** 名前の文字数の上限。文字は見た目の1文字（書記素）で数える */
export const CHARACTER_NAME_MAX_LENGTH = 10;

/** 前後の空白を取り除いた名前を返す。決まりに合わなければ断る理由を返す */
export const normalizeCharacterName = (
  raw: string | undefined,
): { ok: true; name: string } | { ok: false; reason: 'nameRequired' | 'nameTooLong' } => {
  const name = (raw ?? '').trim();
  if (name === '') return { ok: false, reason: 'nameRequired' };
  if (countGraphemes(name) > CHARACTER_NAME_MAX_LENGTH) return { ok: false, reason: 'nameTooLong' };
  return { ok: true, name };
};

/** ビートと、それが属するシーンを返す。無ければ undefined */
export const locateBeat = (
  scenario: Scenario,
  beatId: string,
): { scene: Scene; beat: Beat } | undefined => {
  for (const scene of scenario.scenes) {
    const beat = scene.beats.find((b) => b.id === beatId);
    if (beat) return { scene, beat };
  }
  return undefined;
};

export const startPlay = (scenario: Scenario): PlayState => ({
  beatId: scenario.start,
  characterName: null,
  log: [],
});

/** ビートの内容（地の文の段落か、会話の台詞）をログの行にする */
const beatEntries = (beat: Beat): LogEntry[] =>
  beat.layout === 'paper'
    ? beat.text.map((text) => ({ beatId: beat.id, speaker: null, text }))
    : beat.lines.map((line) => ({ beatId: beat.id, speaker: line.speaker, text: line.text }));

export const playCard = (
  scenario: Scenario,
  state: PlayState,
  cardId: string,
  characterName?: string,
): PlayCardResult => {
  const beat = locateBeat(scenario, state.beatId)?.beat;
  const card = beat?.hand.find((c) => c.id === cardId);
  if (!(beat && card)) return { ok: false, reason: 'unknownCard' };
  let name = state.characterName;
  if (card.asksCharacterName) {
    const normalized = normalizeCharacterName(characterName);
    if (!normalized.ok) return normalized;
    name = normalized.name;
  }
  const log = [...state.log, ...beatEntries(beat)];
  if (card.say !== undefined)
    log.push({ beatId: beat.id, speaker: PLAYER_SPEAKER, text: card.say });
  return { ok: true, state: { beatId: card.next, characterName: name, log } };
};
