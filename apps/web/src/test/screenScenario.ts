// 画面のテスト用のシナリオ。実データでは作れない並び（台詞の数が違う会話 → 会話、会話 → 紙面 → 会話、別のシーンへ移る）を確かめる
import { scenarioSchema } from '@cartagraph/domain/scenario/model';

const card = (id: string, next: string, extra: Record<string, unknown> = {}) => ({
  id,
  title: `カード ${id}`,
  text: `説明 ${id}`,
  next,
  ...extra,
});

export const screenScenario = scenarioSchema.parse({
  id: 'screen',
  title: '画面のテスト',
  start: 'x1',
  npcs: [
    {
      id: 'A',
      name: 'エー',
      title: '肩書A',
      description: 'ひとことA',
      portrait: { type: 'icon', name: 'GiBookCover' },
    },
    {
      id: 'B',
      name: 'ビー',
      title: '肩書B',
      description: 'ひとことB',
      portrait: { type: 'image', src: '/portrait-b.png' },
    },
  ],
  scenes: [
    {
      id: 'sx',
      title: 'シーン X',
      beats: [
        {
          id: 'x1',
          layout: 'conversation',
          lines: [{ speaker: 'A', text: 'x1 の台詞' }],
          hand: [card('c1', 'x2')],
        },
        {
          id: 'x2',
          layout: 'conversation',
          lines: [
            { speaker: 'A', text: 'x2 の台詞 1' },
            { speaker: 'B', text: 'x2 の台詞 2' },
            { speaker: 'A', text: 'x2 の台詞 3' },
          ],
          hand: [card('c2', 'x3', { say: 'c2 の返事' })],
        },
        {
          id: 'x3',
          layout: 'conversation',
          lines: [
            { speaker: 'B', text: 'x3 の台詞 1' },
            { speaker: 'A', text: 'x3 の台詞 2' },
          ],
          hand: [card('c3', 'x4')],
        },
        {
          id: 'x4',
          layout: 'paper',
          text: ['x4 の段落'],
          hand: [card('c4', 'x5', { say: 'c4 の返事' })],
        },
        {
          id: 'x5',
          layout: 'conversation',
          lines: [{ speaker: 'A', text: 'x5 の台詞' }],
          hand: [card('c5', 'y1')],
        },
      ],
    },
    {
      id: 'sy',
      title: 'シーン Y',
      beats: [
        {
          id: 'y1',
          layout: 'conversation',
          lines: [{ speaker: 'A', text: 'y1 の台詞' }],
          hand: [],
        },
      ],
    },
  ],
});
