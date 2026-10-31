// 会話の画面の境界（台詞の数・送り位置・履歴の範囲・NPC のカード・スクロール・絵）
// （docs/plans/2026-10-31-P5-会話の画面.md D2・D3・D6・テスト14〜16・18・22〜24）
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderPlay } from './renderPlay';
import { screenScenario } from './screenScenario';

const NEXT = '次へ';
const NOT_READY = '続きは準備中です。';

type User = ReturnType<typeof userEvent.setup>;

const logTexts = () => [...screen.getByRole('log').querySelectorAll('p')].map((p) => p.textContent);
const hasCard = (id: string) => screen.queryByRole('button', { name: new RegExp(`カード ${id}`) });
const next = (user: User) => user.click(screen.getByRole('button', { name: NEXT }));
const play = (user: User, id: string) =>
  user.click(screen.getByRole('button', { name: new RegExp(`カード ${id}`) }));

// 台詞を出し切って、手札のカードを出す
const finishAndPlay = async (user: User, lineCount: number, cardId: string) => {
  for (let i = 1; i < lineCount; i++) await next(user);
  await play(user, cardId);
};

const start = () => {
  const user = userEvent.setup();
  renderPlay(screenScenario);
  return user;
};

// biome-ignore lint/correctness/usePlaywrightValidDescribeCallback: Vitest の describe は第2引数にオプション（tags）を取れる
describe('台詞の数の境界', { tags: ['rule:index/ビートの見せ方'] }, () => {
  it('台詞1つ・手札ありのビートは、入った時点で「次へ」が無く手札が出ている', () => {
    start();
    expect(screen.queryByRole('button', { name: NEXT })).not.toBeInTheDocument();
    expect(hasCard('c1')).toBeInTheDocument();
  });

  it('台詞2つのビートは、1つ目だけ・手札なし・「次へ」あり。1回押すと2つ目が出て「次へ」が消え手札が出る', async () => {
    const user = start();
    await finishAndPlay(user, 1, 'c1');
    await finishAndPlay(user, 3, 'c2');
    await screen.findByText('x3 の台詞 1');
    expect(logTexts().at(-1)).toBe('x3 の台詞 1');
    expect(hasCard('c3')).not.toBeInTheDocument();
    await next(user);
    expect(logTexts().at(-1)).toBe('x3 の台詞 2');
    expect(screen.queryByRole('button', { name: NEXT })).not.toBeInTheDocument();
    expect(hasCard('c3')).toBeInTheDocument();
  });

  it('台詞1つ・手札なしのビートは「次へ」が無く「続きは準備中です。」が出る', async () => {
    const user = start();
    await finishAndPlay(user, 1, 'c1');
    await finishAndPlay(user, 3, 'c2');
    await finishAndPlay(user, 2, 'c3');
    await finishAndPlay(user, 1, 'c4');
    await finishAndPlay(user, 1, 'c5');
    await screen.findByRole('heading', { level: 1, name: 'シーン Y' });
    expect(screen.queryByRole('button', { name: NEXT })).not.toBeInTheDocument();
    expect(screen.getByText(NOT_READY)).toBeInTheDocument();
  });
});

// biome-ignore lint/correctness/usePlaywrightValidDescribeCallback: Vitest の describe は第2引数にオプション（tags）を取れる
describe('台詞の送りと履歴', { tags: ['rule:index/ビートの見せ方'] }, () => {
  it('履歴は送り位置で増えない：入った時点の並びが先頭に残り、「次へ」で末尾に1つ増える', async () => {
    const user = start();
    await play(user, 'c1');
    await screen.findByText('x2 の台詞 1');
    const before = logTexts();
    expect(before).toEqual(['x1 の台詞', 'x2 の台詞 1']);
    await next(user);
    expect(logTexts()).toEqual([...before, 'x2 の台詞 2']);
  });

  it('台詞の多いビートから台詞の少ないビートへ移ると、送り位置は最初に戻る（key）', async () => {
    const user = start();
    await finishAndPlay(user, 1, 'c1');
    await finishAndPlay(user, 3, 'c2');
    await screen.findByText('x3 の台詞 1');
    expect(screen.getByRole('button', { name: NEXT })).toBeInTheDocument();
    expect(hasCard('c3')).not.toBeInTheDocument();
    expect(screen.queryByText('x3 の台詞 2')).not.toBeInTheDocument();
  });

  it('紙面を挟んでも同じシーンの会話は残り、紙面の段落と say は出ない。別のシーンへ移ると途切れる', async () => {
    const user = start();
    await finishAndPlay(user, 1, 'c1');
    await finishAndPlay(user, 3, 'c2');
    await finishAndPlay(user, 2, 'c3');
    await screen.findByText('x4 の段落');
    await play(user, 'c4');
    await screen.findByText('x5 の台詞');
    expect(logTexts()).toEqual([
      'x1 の台詞',
      'x2 の台詞 1',
      'x2 の台詞 2',
      'x2 の台詞 3',
      'c2 の返事',
      'x3 の台詞 1',
      'x3 の台詞 2',
      'x5 の台詞',
    ]);
    expect(screen.queryByText('x4 の段落')).not.toBeInTheDocument();
    expect(screen.queryByText('c4 の返事')).not.toBeInTheDocument();

    await play(user, 'c5');
    await screen.findByRole('heading', { level: 1, name: 'シーン Y' });
    expect(screen.queryByRole('heading', { name: 'シーン X' })).not.toBeInTheDocument();
    expect(logTexts()).toEqual(['y1 の台詞']);
  });
});

describe('NPC のカード', () => {
  const card = (name: string) => screen.getByRole('article', { name });
  const expectCurrent = (name: string, current: boolean) =>
    expect(card(name)).toHaveAttribute('aria-current', String(current));

  it('そのビートに出る人のカードが並び、直近に話した人のカードだけが光る。次のビートではそのビートの最初の話し手になる', async () => {
    const user = start();
    expect(screen.queryByRole('article', { name: 'ビー' })).not.toBeInTheDocument();
    expectCurrent('エー', true);
    await play(user, 'c1');
    await screen.findByText('x2 の台詞 1');
    expectCurrent('エー', true);
    expectCurrent('ビー', false);
    await next(user);
    expectCurrent('エー', false);
    expectCurrent('ビー', true);
    await next(user);
    expectCurrent('エー', true);
    expectCurrent('ビー', false);
    await play(user, 'c2');
    await screen.findByText('x3 の台詞 1');
    expectCurrent('エー', false);
    expectCurrent('ビー', true);
  });

  it('名前・肩書・ひとことが出る', () => {
    start();
    expect(within(card('エー')).getByText('肩書A')).toBeInTheDocument();
    expect(within(card('エー')).getByText('ひとことA')).toBeInTheDocument();
  });
});

describe('Portrait', () => {
  it('icon は svg で描き、image は <img>（代替テキストは NPC の名前）で描く', async () => {
    const user = start();
    await play(user, 'c1');
    await screen.findByText('x2 の台詞 1');
    const a = screen.getByRole('article', { name: 'エー' });
    const b = screen.getByRole('article', { name: 'ビー' });
    expect(a.querySelector('svg')).not.toBeNull();
    expect(a.querySelector('img')).toBeNull();
    expect(within(b).getByRole('img', { name: 'ビー' })).toHaveAttribute('src', '/portrait-b.png');
    expect(b.querySelector('svg')).toBeNull();
  });

  it('登録表に無いアイコンの名前は例外になる', () => {
    const broken = structuredClone(screenScenario);
    broken.npcs[0] = { ...broken.npcs[0]!, portrait: { type: 'icon', name: 'GiNothing' } };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      expect(() => renderPlay(broken)).toThrow('GiNothing');
    } finally {
      spy.mockRestore();
    }
  });
});

describe('会話エリアのスクロール', () => {
  const scrollTopSetter = vi.fn();
  const heightDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollHeight');
  const topDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop');

  afterEach(() => {
    cleanup();
    scrollTopSetter.mockClear();
    if (heightDescriptor)
      Object.defineProperty(Element.prototype, 'scrollHeight', heightDescriptor);
    if (topDescriptor) Object.defineProperty(Element.prototype, 'scrollTop', topDescriptor);
  });

  it('台詞が出るたびに、会話エリアの scrollTop を scrollHeight にする', async () => {
    Object.defineProperty(Element.prototype, 'scrollHeight', {
      configurable: true,
      get: () => 999,
    });
    Object.defineProperty(Element.prototype, 'scrollTop', {
      configurable: true,
      get: () => 0,
      set(this: Element, value: number) {
        if (this.getAttribute('role') === 'log') scrollTopSetter(value);
      },
    });
    const user = start();
    await finishAndPlay(user, 1, 'c1');
    expect(scrollTopSetter).toHaveBeenLastCalledWith(999);
    const afterEnter = scrollTopSetter.mock.calls.length;
    await next(user);
    expect(scrollTopSetter.mock.calls.length).toBe(afterEnter + 1);
    expect(scrollTopSetter).toHaveBeenLastCalledWith(999);
  });
});
