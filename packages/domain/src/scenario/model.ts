// シナリオ・シーン・手札・プレイの状態の型（docs/cartagraph/index.md「シーンですること」「キャラクター」）
import { z } from 'zod';

export const cardSchema = z.object({
  id: z.string(),
  title: z.string(),
  text: z.string(),
  /** 出した後に進むシーンの id */
  next: z.string(),
  /** 出すときにキャラクターの名前を書くカードか */
  asksCharacterName: z.boolean().default(false),
});
export type Card = z.infer<typeof cardSchema>;

export const sceneSchema = z.object({
  id: z.string(),
  title: z.string(),
  /** 段落の配列。`{characterName}` はキャラクターの名前に置き換えて出す */
  text: z.array(z.string()),
  /** 空なら、続きは準備中 */
  hand: z.array(cardSchema),
});
export type Scene = z.infer<typeof sceneSchema>;

/** 参照の切れ（無いシーンを指す start・next）と id の重複を、読み込みの時に止める */
export const scenarioSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    start: z.string(),
    scenes: z.array(sceneSchema),
  })
  .superRefine((scenario, ctx) => {
    const sceneIds = new Set<string>();
    scenario.scenes.forEach((scene, i) => {
      if (sceneIds.has(scene.id))
        ctx.addIssue({
          code: 'custom',
          message: `シーンの id が重複している：${scene.id}`,
          path: ['scenes', i, 'id'],
        });
      sceneIds.add(scene.id);
    });
    if (!sceneIds.has(scenario.start))
      ctx.addIssue({
        code: 'custom',
        message: `start が無いシーンを指す：${scenario.start}`,
        path: ['start'],
      });
    scenario.scenes.forEach((scene, i) => {
      const cardIds = new Set<string>();
      scene.hand.forEach((card, j) => {
        if (cardIds.has(card.id))
          ctx.addIssue({
            code: 'custom',
            message: `手札のカードの id が重複している：${card.id}`,
            path: ['scenes', i, 'hand', j, 'id'],
          });
        cardIds.add(card.id);
        if (!sceneIds.has(card.next))
          ctx.addIssue({
            code: 'custom',
            message: `カードの next が無いシーンを指す：${card.next}`,
            path: ['scenes', i, 'hand', j, 'next'],
          });
      });
    });
  });
export type Scenario = z.infer<typeof scenarioSchema>;

export const playStateSchema = z.object({
  sceneId: z.string(),
  /** まだ名乗っていなければ null */
  characterName: z.string().nullable(),
});
export type PlayState = z.infer<typeof playStateSchema>;
