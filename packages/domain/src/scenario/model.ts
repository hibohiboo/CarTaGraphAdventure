// シナリオ・シーン・ビート・手札・NPC・プレイの状態の型（docs/cartagraph/index.md「シーンですること」「ビートの見せ方」「キャラクター」）
import { z } from 'zod';

export const cardSchema = z.strictObject({
  id: z.string(),
  title: z.string(),
  text: z.string(),
  /** 出した後に進むビートの id */
  next: z.string(),
  /** 出すときにキャラクターの名前を書くカードか */
  asksCharacterName: z.boolean().default(false),
  /** 出すと会話に足される、自分（キャラクター）の台詞。`{characterName}` を使える */
  say: z.string().optional(),
});
export type Card = z.infer<typeof cardSchema>;

/** NPC の絵。アイコンの名前は画面側の登録表から引く（ドメインは React を知らない） */
export const portraitSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('icon'), name: z.string().min(1) }),
  z.strictObject({ type: z.literal('image'), src: z.string().min(1) }),
]);
export type Portrait = z.infer<typeof portraitSchema>;

/** プレイヤーの台詞の話し手（ログの speaker）。NPC の id には使えない */
export const PLAYER_SPEAKER = 'player';

export const npcSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string(),
  /** 肩書 */
  title: z.string(),
  /** ひとこと */
  description: z.string(),
  portrait: portraitSchema,
});
export type Npc = z.infer<typeof npcSchema>;

export const dialogueLineSchema = z.strictObject({
  /** NPC の id */
  speaker: z.string(),
  text: z.string(),
});
export type DialogueLine = z.infer<typeof dialogueLineSchema>;

/** 空なら、続きは準備中 */
const handSchema = z.array(cardSchema);

export const beatSchema = z.discriminatedUnion('layout', [
  z.strictObject({
    layout: z.literal('paper'),
    id: z.string(),
    /** 段落の配列。`{characterName}` はキャラクターの名前に置き換えて出す */
    text: z.array(z.string()),
    hand: handSchema,
  }),
  z.strictObject({
    layout: z.literal('conversation'),
    id: z.string(),
    lines: z.array(dialogueLineSchema).min(1),
    hand: handSchema,
  }),
]);
export type Beat = z.infer<typeof beatSchema>;

export const sceneSchema = z.strictObject({
  id: z.string(),
  title: z.string(),
  beats: z.array(beatSchema).min(1),
});
export type Scene = z.infer<typeof sceneSchema>;

/** 参照の切れ（無い NPC・ビートを指す speaker・start・next）と id の重複を、読み込みの時に止める */
export const scenarioSchema = z
  .strictObject({
    id: z.string(),
    title: z.string(),
    /** 始めるビートの id */
    start: z.string(),
    npcs: z.array(npcSchema),
    scenes: z.array(sceneSchema),
  })
  .superRefine((scenario, ctx) => {
    const issue = (message: string, path: (string | number)[]) =>
      ctx.addIssue({ code: 'custom', message, path });

    const npcIds = new Set<string>();
    scenario.npcs.forEach((npc, i) => {
      if (npc.id === PLAYER_SPEAKER || npcIds.has(npc.id))
        issue(`NPC の id が重複している（または ${PLAYER_SPEAKER}）：${npc.id}`, ['npcs', i, 'id']);
      npcIds.add(npc.id);
    });

    const sceneIds = new Set<string>();
    const beatIds = new Set<string>();
    scenario.scenes.forEach((scene, i) => {
      if (sceneIds.has(scene.id))
        issue(`シーンの id が重複している：${scene.id}`, ['scenes', i, 'id']);
      sceneIds.add(scene.id);
      scene.beats.forEach((beat, j) => {
        if (beatIds.has(beat.id))
          issue(`ビートの id が重複している：${beat.id}`, ['scenes', i, 'beats', j, 'id']);
        beatIds.add(beat.id);
      });
    });

    if (!beatIds.has(scenario.start))
      issue(`start が無いビートを指す：${scenario.start}`, ['start']);

    scenario.scenes.forEach((scene, i) => {
      scene.beats.forEach((beat, j) => {
        const at = ['scenes', i, 'beats', j];
        if (beat.layout === 'conversation')
          beat.lines.forEach((line, k) => {
            if (!npcIds.has(line.speaker))
              issue(`speaker が無い NPC を指す：${line.speaker}`, [...at, 'lines', k, 'speaker']);
          });
        const cardIds = new Set<string>();
        beat.hand.forEach((card, k) => {
          if (cardIds.has(card.id))
            issue(`手札のカードの id が重複している：${card.id}`, [...at, 'hand', k, 'id']);
          cardIds.add(card.id);
          if (!beatIds.has(card.next))
            issue(`カードの next が無いビートを指す：${card.next}`, [...at, 'hand', k, 'next']);
        });
      });
    });
  });
export type Scenario = z.infer<typeof scenarioSchema>;

/**
 * プレイログの1行。speaker は NPC の id・PLAYER_SPEAKER・null（地の文）。
 * text は `{characterName}` を置き換える前の形で持つ
 */
export const logEntrySchema = z.strictObject({
  beatId: z.string(),
  speaker: z.string().nullable(),
  text: z.string(),
});
export type LogEntry = z.infer<typeof logEntrySchema>;

/**
 * 遊んだことのイベント（集約「プレイ」。docs/architecture/aggregates.md）。列を流し直すと状態に戻る。
 * characterName は名前を書くカードのときだけ（正規化した後の名前）、text は正規化した後の提案の文
 */
export const playEventSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('cardPlayed'),
    beatId: z.string(),
    cardId: z.string(),
    characterName: z.string().optional(),
  }),
  z.strictObject({ type: z.literal('proposed'), beatId: z.string(), text: z.string() }),
]);
export type PlayEvent = z.infer<typeof playEventSchema>;

export const playStateSchema = z.strictObject({
  beatId: z.string(),
  /** まだ名乗っていなければ null */
  characterName: z.string().nullable(),
  /** 仮の形：会話の履歴の入れ物。イベントの列（PlayEvent）とは別で、置き換えは core-loop。docs/open-questions.md「遊んだことの持ち方の残り」 */
  log: z.array(logEntrySchema),
});
export type PlayState = z.infer<typeof playStateSchema>;
