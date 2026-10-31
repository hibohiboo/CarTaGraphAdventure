// テスト用の小さなシナリオ。実データ（adventurer-exam）では作れない分岐（名前の要らないカード・別のシーンへ移るカード・紙面と会話の入れ替わり）を確かめる
import { scenarioSchema } from './model';

const npc = (id: string) => ({
  id,
  name: `NPC ${id}`,
  title: '肩書',
  description: 'ひとこと',
  portrait: { type: 'icon', name: 'GiBookCover' },
});

const card = (id: string, next: string, extra: Record<string, unknown> = {}) => ({
  id,
  title: `カード ${id}`,
  text: `カードの説明 ${id}`,
  next,
  ...extra,
});

export const testScenario = scenarioSchema.parse({
  id: 'test',
  title: 'テストのシナリオ',
  start: 'a1',
  npcs: [npc('A'), npc('B')],
  scenes: [
    {
      id: 'sa',
      title: 'シーン A',
      beats: [
        {
          id: 'a1',
          layout: 'paper',
          text: ['a1 の段落 1', 'a1 の段落 2'],
          hand: [card('name', 'a2', { asksCharacterName: true }), card('walk', 'a2')],
        },
        {
          id: 'a2',
          layout: 'conversation',
          lines: [
            { speaker: 'A', text: 'a2 の台詞 1' },
            { speaker: 'B', text: 'a2 の台詞 2' },
            { speaker: 'A', text: 'a2 の台詞 3 {characterName}' },
          ],
          hand: [card('reply', 'a3', { say: 'a2 の返事 {characterName}' })],
        },
        {
          id: 'a3',
          layout: 'conversation',
          lines: [
            { speaker: 'B', text: 'a3 の台詞 1' },
            { speaker: 'A', text: 'a3 の台詞 2' },
          ],
          hand: [card('leave', 'b1')],
        },
      ],
    },
    {
      id: 'sb',
      title: 'シーン B',
      beats: [
        {
          id: 'b1',
          layout: 'conversation',
          lines: [{ speaker: 'A', text: 'b1 の台詞' }],
          hand: [card('toPaper', 'b2')],
        },
        {
          id: 'b2',
          layout: 'paper',
          text: ['b2 の段落'],
          hand: [card('toTalk', 'b3', { say: 'b2 の返事' })],
        },
        {
          id: 'b3',
          layout: 'conversation',
          lines: [{ speaker: 'B', text: 'b3 の台詞' }],
          hand: [],
        },
      ],
    },
  ],
});
