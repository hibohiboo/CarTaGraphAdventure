// シーンの文の名前の置き換え（docs/plans/2026-10-31-P4-試験の最初のシーン.md D4・テスト8）
import { describe, expect, it } from 'vitest';
import { renderText } from './text';

const named = (characterName: string | null) => ({ sceneId: 'any', characterName });

describe('renderText', () => {
  it('{characterName} を名前に置き換える', () => {
    expect(renderText('「{characterName}さんね」', named('アリサ'))).toBe('「アリサさんね」');
  });

  it('同じ文の2つの {characterName} を両方置き換える', () => {
    expect(renderText('{characterName}と{characterName}', named('ロウ'))).toBe('ロウとロウ');
  });

  it("名前に $& や $' を含んでもそのまま出る", () => {
    expect(renderText('[{characterName}]', named("$&$'$$"))).toBe("[$&$'$$]");
  });

  it('名前が null なら置き換えずに残す', () => {
    expect(renderText('{characterName}さん', named(null))).toBe('{characterName}さん');
  });

  it('ほかの {foo} は残す', () => {
    expect(renderText('{foo}と{characterName}', named('アリサ'))).toBe('{foo}とアリサ');
  });
});
