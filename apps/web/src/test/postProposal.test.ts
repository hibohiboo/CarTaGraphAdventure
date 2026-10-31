// 提案を送る関数（docs/plans/2026-10-31-P6-提案の保存.md D6・テスト39）。fetch を差し替えて確かめる
import { afterEach, describe, expect, it, vi } from 'vitest';
import { postProposal } from '@/entities/proposal/api/postProposal';

const request = {
  scenarioId: 'adventurer-exam',
  text: '質問したい',
  events: [{ type: 'cardPlayed' as const, beatId: 'entrance', cardId: 'approach' }],
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('postProposal', () => {
  it('/api/proposals へ JSON で POST し、201 で { file } を返す', async () => {
    const fetchMock = vi.fn(async () => json(201, { file: 'docs/backlog/proposal-x.md' }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await postProposal(request)).toEqual({ ok: true, file: 'docs/backlog/proposal-x.md' });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(new URL(url).pathname).toBe('/api/proposals');
    expect(new URL(url).origin).toBe(window.location.origin);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(request);
  });

  it.each([
    [403, 'この接続元からは提案できません'],
    [422, '提案の文を書いてください'],
    [500, '要望のファイルを書けませんでした'],
  ])('%i は応答の message を理由にして返す', async (status, message) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(status, { message })),
    );
    expect(await postProposal(request)).toEqual({ ok: false, message });
  });

  it('本文が JSON でない失敗は、状態コードを理由にする', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('Bad Gateway', { status: 502 })),
    );
    expect(await postProposal(request)).toEqual({ ok: false, message: '状態コード 502' });
  });

  it('201 でも形が違えば失敗にする', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(201, { path: 'x' })),
    );
    expect(await postProposal(request)).toEqual({
      ok: false,
      message: '応答の形が正しくありません',
    });
  });

  it('通信の失敗も理由にして返す（例外にしない）', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    expect(await postProposal(request)).toEqual({ ok: false, message: '通信に失敗しました' });
  });
});
