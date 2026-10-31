// シナリオのスキーマの形と参照の検査（docs/plans/2026-10-31-P5-会話の画面.md D1・D2・テスト2・3）
import { describe, expect, it } from 'vitest';
import { adventurerExam } from './adventurer-exam';
import { portraitSchema, scenarioSchema } from './model';

// 実データを複製して1か所だけ書き換える。形を壊す書き換えもするので any で触る
// biome-ignore lint/suspicious/noExplicitAny: 形が壊れた入力を作るため
type Raw = any;
const edit = (change: (raw: Raw) => void) => {
  const raw: Raw = structuredClone(adventurerExam);
  change(raw);
  return scenarioSchema.safeParse(raw);
};

const issuePaths = (result: ReturnType<typeof scenarioSchema.safeParse>) =>
  result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));

// 実データの位置：scenes.0.beats.0 = entrance（紙面）、1 = reception（会話）、2 = exam-begins
describe('scenarioSchema の検査', () => {
  it('書き換えない実データは通る', () => {
    expect(scenarioSchema.safeParse(structuredClone(adventurerExam)).success).toBe(true);
  });

  it.each([
    [
      'speaker が無い NPC を指す',
      (raw: Raw) => {
        raw.scenes[0].beats[1].lines[0].speaker = 'nobody';
      },
      'scenes.0.beats.1.lines.0.speaker',
    ],
    [
      'speaker が player',
      (raw: Raw) => {
        raw.scenes[0].beats[1].lines[0].speaker = 'player';
      },
      'scenes.0.beats.1.lines.0.speaker',
    ],
    [
      'NPC の id の重複',
      (raw: Raw) => {
        raw.npcs.push(structuredClone(raw.npcs[0]));
      },
      'npcs.1.id',
    ],
    [
      'NPC の id が player',
      (raw: Raw) => {
        raw.npcs[0].id = 'player';
        for (const line of raw.scenes[0].beats[1].lines) line.speaker = 'player';
        raw.scenes[0].beats[2].lines[0].speaker = 'player';
      },
      'npcs.0.id',
    ],
    [
      'NPC の id が空文字',
      (raw: Raw) => {
        raw.npcs[0].id = '';
        for (const line of raw.scenes[0].beats[1].lines) line.speaker = '';
        raw.scenes[0].beats[2].lines[0].speaker = '';
      },
      'npcs.0.id',
    ],
    [
      'start が無いビートを指す',
      (raw: Raw) => {
        raw.start = 'nowhere';
      },
      'start',
    ],
    [
      'カードの next が無いビートを指す',
      (raw: Raw) => {
        raw.scenes[0].beats[0].hand[0].next = 'nowhere';
      },
      'scenes.0.beats.0.hand.0.next',
    ],
    [
      'ビートの id の重複（同じシーンの中）',
      (raw: Raw) => {
        raw.scenes[0].beats.push({ id: 'entrance', layout: 'paper', text: [], hand: [] });
      },
      'scenes.0.beats.3.id',
    ],
    [
      'ビートの id の重複（別のシーンどうし）',
      (raw: Raw) => {
        const other = structuredClone(raw.scenes[0]);
        other.id = 'other';
        raw.scenes.push(other);
      },
      'scenes.1.beats.0.id,scenes.1.beats.1.id,scenes.1.beats.2.id',
    ],
    [
      'シーンの id の重複',
      (raw: Raw) => {
        raw.scenes.push({
          id: 'guild-reception',
          title: 'x',
          beats: [{ id: 'extra', layout: 'paper', text: [], hand: [] }],
        });
      },
      'scenes.1.id',
    ],
    [
      '同じ手札のカードの id の重複',
      (raw: Raw) => {
        raw.scenes[0].beats[0].hand.push(structuredClone(raw.scenes[0].beats[0].hand[0]));
      },
      'scenes.0.beats.0.hand.1.id',
    ],
    [
      '会話のビートの lines が空',
      (raw: Raw) => {
        raw.scenes[0].beats[1].lines = [];
      },
      'scenes.0.beats.1.lines',
    ],
    [
      'シーンの beats が空',
      (raw: Raw) => {
        raw.scenes.push({ id: 'empty', title: 'x', beats: [] });
      },
      'scenes.1.beats',
    ],
    [
      'layout が無い',
      (raw: Raw) => {
        delete raw.scenes[0].beats[0].layout;
      },
      'scenes.0.beats.0.layout',
    ],
    [
      'layout が未知',
      (raw: Raw) => {
        raw.scenes[0].beats[0].layout = 'movie';
      },
      'scenes.0.beats.0.layout',
    ],
    [
      'paper に lines を入れる',
      (raw: Raw) => {
        raw.scenes[0].beats[0].lines = [];
      },
      'scenes.0.beats.0',
    ],
    [
      'conversation に text を入れる',
      (raw: Raw) => {
        raw.scenes[0].beats[1].text = [];
      },
      'scenes.0.beats.1',
    ],
    [
      'カードに未知のキー',
      (raw: Raw) => {
        raw.scenes[0].beats[1].hand[0].sya = 'x';
      },
      'scenes.0.beats.1.hand.0',
    ],
    [
      'portrait の type が未知',
      (raw: Raw) => {
        raw.npcs[0].portrait.type = 'video';
      },
      'npcs.0.portrait.type',
    ],
    [
      'image に src が無い',
      (raw: Raw) => {
        raw.npcs[0].portrait = { type: 'image' };
      },
      'npcs.0.portrait.src',
    ],
    [
      'say が文字列でない',
      (raw: Raw) => {
        raw.scenes[0].beats[1].hand[0].say = 1;
      },
      'scenes.0.beats.1.hand.0.say',
    ],
  ])('%s と、その場所を指して断る', (_, change, path) => {
    const result = edit(change);
    expect(result.success).toBe(false);
    expect(issuePaths(result).join(',')).toBe(path);
  });

  it('npcs が空で台詞があると断る', () => {
    const result = edit((raw) => {
      raw.npcs = [];
    });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual([
      'scenes.0.beats.1.lines.0.speaker',
      'scenes.0.beats.1.lines.1.speaker',
      'scenes.0.beats.1.lines.2.speaker',
      'scenes.0.beats.2.lines.0.speaker',
    ]);
  });

  it('境界の内側：lines が1つ、start が2番目のシーン、ビートの id がシーンの id と同じは通る', () => {
    expect(
      edit((raw) => {
        raw.scenes[0].beats[1].lines = [raw.scenes[0].beats[1].lines[0]];
      }).success,
    ).toBe(true);
    expect(
      edit((raw) => {
        raw.scenes.push({
          id: 'second',
          title: 'x',
          beats: [{ id: 'second-start', layout: 'paper', text: [], hand: [] }],
        });
        raw.start = 'second-start';
      }).success,
    ).toBe(true);
    expect(
      edit((raw) => {
        raw.scenes[0].beats[0].id = 'guild-reception';
        raw.start = 'guild-reception';
      }).success,
    ).toBe(true);
  });
});

describe('portraitSchema', () => {
  it.each([[{ type: 'icon', name: 'GiBookCover' }], [{ type: 'image', src: '/milda.png' }]])(
    '通す：%j',
    (value) => {
      expect(portraitSchema.safeParse(value).success).toBe(true);
    },
  );

  it.each([
    ['type が無い', { name: 'GiBookCover' }],
    ['name が空文字', { type: 'icon', name: '' }],
    ['src が空文字', { type: 'image', src: '' }],
    ['別の項目が混ざる', { type: 'icon', name: 'GiBookCover', src: '/x.png' }],
  ])('断る：%s', (_, value) => {
    expect(portraitSchema.safeParse(value).success).toBe(false);
  });
});
