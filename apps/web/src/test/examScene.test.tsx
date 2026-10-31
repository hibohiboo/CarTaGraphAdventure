// 試験の受付で名乗る（docs/plans/2026-10-31-P5-会話の画面.md D3・D5・D6・テスト12〜14・17・19〜21）
import { adventurerExam } from '@cartagraph/domain/scenario/adventurer-exam';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderAt } from './renderAt';

const beatOf = (id: string) => {
  const beat = adventurerExam.scenes.flatMap((scene) => scene.beats).find((b) => b.id === id);
  if (!beat) throw new Error(id);
  return beat;
};
const paperOf = (id: string) => {
  const beat = beatOf(id);
  if (beat.layout !== 'paper') throw new Error(id);
  return beat;
};
const talkOf = (id: string) => {
  const beat = beatOf(id);
  if (beat.layout !== 'conversation') throw new Error(id);
  return beat;
};

const scene = adventurerExam.scenes[0]!;
const entrance = paperOf('entrance');
const reception = talkOf('reception');
const examBegins = talkOf('exam-begins');
const approach = entrance.hand[0]!;
const introduce = reception.hand.find((card) => card.asksCharacterName)!;
const milda = adventurerExam.npcs[0]!;
// 名前の入った文の期待値。実装と同じ renderText では作らない
const withName = (text: string, name: string) => text.split('{characterName}').join(name);

const NAME_LABEL = 'キャラクターの名前';
const CONFIRM = 'この名前で名乗る';
const NOT_READY = '続きは準備中です。';
const NEXT = '次へ';
const NOT_NAMED = '（まだ名乗っていない）';

const expectTitle = () =>
  expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual([
    scene.title,
  ]);
const buttonOf = (title: string) => screen.queryByRole('button', { name: new RegExp(title) });
const logTexts = () => [...screen.getByRole('log').querySelectorAll('p')].map((p) => p.textContent);

const openEntrance = async () => {
  const user = userEvent.setup();
  renderAt('/');
  await user.click(screen.getByRole('link', { name: '試験を受ける' }));
  await screen.findByText(entrance.text[0]!);
  return user;
};

const openReception = async () => {
  const user = await openEntrance();
  await user.click(screen.getByRole('button', { name: new RegExp(approach.title) }));
  await within(await screen.findByRole('log')).findByText(reception.lines[0]!.text);
  return user;
};

const readAll = async (user: ReturnType<typeof userEvent.setup>) => {
  for (let i = 1; i < reception.lines.length; i++)
    await user.click(screen.getByRole('button', { name: NEXT }));
};

const introduceWith = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
  await user.click(screen.getByRole('button', { name: new RegExp(introduce.title) }));
  if (name !== '') await user.type(screen.getByLabelText(NAME_LABEL), name);
  await user.click(screen.getByRole('button', { name: CONFIRM }));
};

describe('試験の入口（紙面のビート）', () => {
  it('ホームの「試験を受ける」から入口に入り、地の文と「受付へ進む」が出る。会話の部品は無い', async () => {
    await openEntrance();
    expectTitle();
    expect(screen.getByRole('button', { name: new RegExp(approach.title) })).toBeInTheDocument();
    expect(screen.queryByRole('log')).not.toBeInTheDocument();
    expect(buttonOf(NEXT)).not.toBeInTheDocument();
    expect(screen.queryByText(milda.name)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

// biome-ignore lint/correctness/usePlaywrightValidDescribeCallback: Vitest の describe は第2引数にオプション（tags）を取れる
describe('受付（会話のビート）', { tags: ['rule:index/ビートの見せ方'] }, () => {
  it('「受付へ進む」で会話に移る。NPC のカード・最初の台詞だけの会話・「次へ」が出て、手札は出ない', async () => {
    await openReception();
    expectTitle();
    expect(screen.getByText(milda.name)).toBeInTheDocument();
    expect(screen.getByText(milda.title)).toBeInTheDocument();
    expect(screen.getByText(milda.description)).toBeInTheDocument();
    expect(logTexts()).toEqual([reception.lines[0]!.text]);
    expect(screen.getByRole('button', { name: NEXT })).toBeInTheDocument();
    expect(buttonOf(introduce.title)).not.toBeInTheDocument();
    expect(screen.getByText(NOT_NAMED)).toBeInTheDocument();
    expect(screen.queryByText(entrance.text[0]!)).not.toBeInTheDocument();
  });

  it('「次へ」を押すたびに台詞が1つずつ増え、最後に「次へ」が消えて手札「名乗る」が出る', async () => {
    const user = await openReception();
    for (let shown = 1; shown < reception.lines.length; shown++) {
      expect(logTexts()).toHaveLength(shown);
      expect(buttonOf(introduce.title)).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: NEXT }));
    }
    expect(logTexts()).toEqual(reception.lines.map((line) => line.text));
    expect(buttonOf(NEXT)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: new RegExp(introduce.title) })).toBeInTheDocument();
  });

  it('名乗るを押すと入力欄が出て記入欄にフォーカスが移る。確定の前は次のビートの台詞が無い', async () => {
    const user = await openReception();
    await readAll(user);
    await user.click(screen.getByRole('button', { name: new RegExp(introduce.title) }));
    expect(screen.getByLabelText(NAME_LABEL)).toHaveFocus();
    expect(screen.queryByText(withName(examBegins.lines[0]!.text, ''))).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('名前を確定すると、ミルダの台詞・自分の台詞・次の台詞がこの順に並び、名前が自分のカードに出る', async () => {
    const user = await openReception();
    await readAll(user);
    await introduceWith(user, 'アリサ');
    await within(screen.getByRole('log')).findByText(withName(examBegins.lines[0]!.text, 'アリサ'));
    expectTitle();
    expect(logTexts()).toEqual([
      ...reception.lines.map((line) => line.text),
      'アリサ',
      'アリサさんね。では、試験を始めましょう',
    ]);
    expect(
      within(screen.getByRole('region', { name: '自分のキャラクター' })).getByText('アリサ'),
    ).toBeInTheDocument();
    expect(screen.queryByText(NOT_NAMED)).not.toBeInTheDocument();
    expect(screen.queryByText(/\{characterName\}/)).not.toBeInTheDocument();
    expect(screen.getByText(NOT_READY)).toBeInTheDocument();
    expect(buttonOf(introduce.title)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(NAME_LABEL)).not.toBeInTheDocument();
  });

  it('空白だけで確定すると理由が出て進まない（入力は残る）。直して確定すると進み、理由は消える', async () => {
    const user = await openReception();
    await readAll(user);
    await introduceWith(user, '　 ');
    expect(screen.getByRole('alert')).toHaveTextContent('名前を書いてください');
    expect(screen.queryByText(withName(examBegins.lines[0]!.text, '　'))).not.toBeInTheDocument();
    expect(logTexts().at(-1)).toBe(reception.lines.at(-1)!.text);
    expect(screen.getByLabelText(NAME_LABEL)).toHaveValue('　 ');

    await user.clear(screen.getByLabelText(NAME_LABEL));
    await user.type(screen.getByLabelText(NAME_LABEL), 'アリサ');
    await user.click(screen.getByRole('button', { name: CONFIRM }));
    await within(screen.getByRole('log')).findByText(withName(examBegins.lines[0]!.text, 'アリサ'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('11文字を確定すると、長すぎる理由が出て進まない', async () => {
    const user = await openReception();
    await readAll(user);
    await introduceWith(user, 'ア'.repeat(11));
    expect(screen.getByRole('alert')).toHaveTextContent('名前は10文字までです');
    expect(logTexts().at(-1)).toBe(reception.lines.at(-1)!.text);
  });

  it('確定を2回続けて押しても理由が出ない', async () => {
    const user = await openReception();
    await readAll(user);
    await user.click(screen.getByRole('button', { name: new RegExp(introduce.title) }));
    await user.type(screen.getByLabelText(NAME_LABEL), 'アリサ');
    await user.dblClick(screen.getByRole('button', { name: CONFIRM }));
    await within(screen.getByRole('log')).findByText(withName(examBegins.lines[0]!.text, 'アリサ'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('名前の HTML は文字のまま出る', async () => {
    const user = await openReception();
    await readAll(user);
    await introduceWith(user, '<b>x</b>');
    await within(screen.getByRole('log')).findByText(
      withName(examBegins.lines[0]!.text, '<b>x</b>'),
    );
    expect(document.querySelector('main b')).toBeNull();
  });

  it('提案のカードは紙面にも出て、会話では台詞を読み切ってから出る。仮の「準備中」の表示は無い', async () => {
    const user = await openEntrance();
    const proposeCard = () => screen.queryByRole('button', { name: 'GM への提案' });
    expect(proposeCard()).toBeInTheDocument();
    expect(screen.queryByText(/準備中です（仮）/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: new RegExp(approach.title) }));
    await screen.findByRole('log');
    expect(proposeCard()).not.toBeInTheDocument();
    await readAll(user);
    expect(proposeCard()).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('次のビートまで進んでから描き直すと、入口のビートに戻る', async () => {
    const user = await openReception();
    await readAll(user);
    await introduceWith(user, 'アリサ');
    await within(screen.getByRole('log')).findByText(withName(examBegins.lines[0]!.text, 'アリサ'));
    cleanup();
    renderAt('/exam');
    expectTitle();
    expect(screen.getByText(entrance.text[0]!)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: new RegExp(approach.title) })).toBeInTheDocument();
    expect(screen.queryByRole('log')).not.toBeInTheDocument();
    expect(buttonOf(introduce.title)).not.toBeInTheDocument();
  });
});
