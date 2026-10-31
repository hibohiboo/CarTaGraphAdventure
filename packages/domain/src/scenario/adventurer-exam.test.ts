// 冒険者登録の試験のシナリオの実データ（docs/plans/2026-10-31-P5-会話の画面.md D7・テスト1）
import { describe, expect, it } from 'vitest';
import { adventurerExam } from './adventurer-exam';
import adventurerExamRaw from './adventurer-exam.json';
import { conversationHistory } from './conversation';
import { type Beat, scenarioSchema } from './model';
import { locateBeat, playCard, startPlay } from './transition';

const beats = adventurerExam.scenes.flatMap((scene) => scene.beats);
const beatById = new Map(beats.map((beat) => [beat.id, beat]));
const npcIds = new Set(adventurerExam.npcs.map((npc) => npc.id));

// start から手札の next をたどって辿り着けるビートの id。beforeNaming なら、名前を書くカードの先へは進まない
const reachable = ({ beforeNaming = false } = {}) => {
  const seen = new Set<string>();
  const queue = [adventurerExam.start];
  for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
    if (seen.has(id)) continue;
    seen.add(id);
    for (const card of beatById.get(id)?.hand ?? [])
      if (!(beforeNaming && card.asksCharacterName)) queue.push(card.next);
  }
  return seen;
};

const sentences = (beat: Beat) =>
  beat.layout === 'paper' ? beat.text : beat.lines.map((line) => line.text);

describe('adventurer-exam', () => {
  it('JSON が scenarioSchema を通る', () => {
    expect(scenarioSchema.safeParse(adventurerExamRaw).success).toBe(true);
  });

  it('start のビートがあり、start から全ビートに辿り着ける', () => {
    expect(beatById.has(adventurerExam.start)).toBe(true);
    expect([...reachable()].sort()).toEqual([...beatById.keys()].sort());
  });

  it('名前を書くカードを通らずに辿り着けるビートの文に {characterName} が無く、名前の後の文と say にはある', () => {
    const beforeNaming = [...reachable({ beforeNaming: true })];
    expect(beforeNaming).toContain(adventurerExam.start);
    for (const id of beforeNaming)
      expect(sentences(beatById.get(id)!).join('\n'), id).not.toContain('{characterName}');
    const named = beatById.get('reception')!.hand.find((card) => card.asksCharacterName)!;
    expect(named.say).toContain('{characterName}');
    expect(sentences(beatById.get(named.next)!).join('\n')).toContain('{characterName}');
  });

  it('会話のビートは台詞を1つ以上持ち、すべての speaker が npcs にある', () => {
    const conversations = beats.filter((beat) => beat.layout === 'conversation');
    expect(conversations.length).toBeGreaterThan(0);
    for (const beat of conversations) {
      expect(beat.lines.length).toBeGreaterThan(0);
      for (const line of beat.lines) expect(npcIds.has(line.speaker)).toBe(true);
    }
  });

  it('入口 → 受付へ進む → 名乗る と出すと、会話の履歴は受付の台詞3つと say の4行で、入口の段落を含まない', () => {
    let state = startPlay(adventurerExam);
    for (const [cardId, name] of [
      ['approach', undefined],
      ['introduce', 'アリサ'],
    ] as const) {
      const result = playCard(adventurerExam, state, cardId, name);
      if (!result.ok) throw new Error(result.reason);
      state = result.state;
    }
    expect(state.beatId).toBe('exam-begins');
    expect(locateBeat(adventurerExam, 'reception')!.scene.id).toBe(
      locateBeat(adventurerExam, state.beatId)!.scene.id,
    );
    const reception = beatById.get('reception')!;
    if (reception.layout !== 'conversation') throw new Error('reception は会話のビート');
    expect(conversationHistory(adventurerExam, state).map((entry) => entry.text)).toEqual([
      ...reception.lines.map((line) => line.text),
      reception.hand[0]!.say,
    ]);
  });
});
