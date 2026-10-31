// テスト用の小さなシナリオ。実データ（adventurer-exam）では作れない分岐（名前の要らないカード・別のシーンのカード）を確かめる
import { scenarioSchema } from './model';

export const testScenario = scenarioSchema.parse({
  id: 'test',
  title: 'テストのシナリオ',
  start: 'first',
  scenes: [
    {
      id: 'first',
      title: '最初のシーン',
      text: ['最初の段落'],
      hand: [
        {
          id: 'name',
          title: '名乗る',
          text: '名前を告げる',
          next: 'second',
          asksCharacterName: true,
        },
        { id: 'walk', title: '歩く', text: '先へ歩く', next: 'second' },
      ],
    },
    {
      id: 'second',
      title: '次のシーン',
      text: ['{characterName}が来た'],
      hand: [{ id: 'back', title: '戻る', text: '最初へ戻る', next: 'first' }],
    },
  ],
});
