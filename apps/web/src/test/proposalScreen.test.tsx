// GM への提案の画面（docs/plans/2026-10-31-P6-提案の保存.md D6・テスト29〜37）。送る関数・一覧・canPropose は props で差し替える
import { adventurerExam } from '@cartagraph/domain/scenario/adventurer-exam';
import type { PlayEvent } from '@cartagraph/domain/scenario/model';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PostProposalResult, SendProposal } from '@/entities/proposal/api/postProposal';
import { renderPlay } from './renderPlay';

const entrance = adventurerExam.scenes[0]?.beats.find((b) => b.id === 'entrance');
const reception = adventurerExam.scenes[0]?.beats.find((b) => b.id === 'reception');
if (!(entrance && reception && reception.layout === 'conversation')) throw new Error('シナリオ');
const approach = entrance.hand[0];
const introduce = reception.hand[0];
if (!(approach && introduce)) throw new Error('手札');

const PROPOSE_CARD = 'GM への提案';
const SUBMIT = '提案する';
const AWAITING = '提案待ち：提案が取り込まれるか見送られるまで、手札は出せません';
const approachEvent: PlayEvent = { type: 'cardPlayed', beatId: 'entrance', cardId: 'approach' };

type User = ReturnType<typeof userEvent.setup>;

const ok: PostProposalResult = { ok: true, file: 'docs/backlog/proposal-x.md' };
const sender = (result: PostProposalResult = ok) => vi.fn<SendProposal>(async () => result);

const card = (title: string) => screen.getByRole('button', { name: new RegExp(title) });
const proposeCard = () => screen.queryByRole('button', { name: PROPOSE_CARD });
const textbox = () => screen.getByRole('textbox', { name: PROPOSE_CARD });

/** 「受付へ進む」を出して、会話を読み切る */
const toReceptionRead = async (user: User) => {
  await user.click(card(approach.title));
  for (let i = 1; i < reception.lines.length; i++)
    await user.click(screen.getByRole('button', { name: '次へ' }));
};

const openAndType = async (user: User, text: string) => {
  await user.click(screen.getByRole('button', { name: PROPOSE_CARD }));
  await user.type(textbox(), text);
};

// biome-ignore lint/correctness/usePlaywrightValidDescribeCallback: Vitest の describe は第2引数にオプション（tags）を取れる
describe('提案を送る', { tags: ['rule:index/提案'] }, () => {
  it('手札を出した後に提案のカードを押して前後に空白のある文を書いて送ると、整えた文と列で送り、提案待ちになる', async () => {
    const user = userEvent.setup();
    const send = sender();
    renderPlay(adventurerExam, { sendProposal: send });
    await toReceptionRead(user);

    await user.click(screen.getByRole('button', { name: PROPOSE_CARD }));
    expect(textbox()).toBeInTheDocument();
    await user.type(textbox(), '  試験官に質問したい  ');
    await user.click(screen.getByRole('button', { name: SUBMIT }));

    await screen.findByText(AWAITING);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({
      scenarioId: 'adventurer-exam',
      text: '試験官に質問したい',
      events: [approachEvent],
    });
    expect(screen.getByText('「試験官に質問したい」')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(card(introduce.title)).toBeDisabled();
  });

  it('空・空白だけの文は送らずに理由を出し、4001文字も同じ。入力欄は開いたまま', async () => {
    const user = userEvent.setup();
    const send = sender();
    renderPlay(adventurerExam, { sendProposal: send });

    await user.click(screen.getByRole('button', { name: PROPOSE_CARD }));
    await user.click(screen.getByRole('button', { name: SUBMIT }));
    expect(await screen.findByRole('alert')).toHaveTextContent('提案の文を書いてください');

    await user.type(textbox(), '   ');
    await user.click(screen.getByRole('button', { name: SUBMIT }));
    expect(screen.getByRole('alert')).toHaveTextContent('提案の文を書いてください');

    // 長い文は貼り付けで入れる（1文字ずつ打つと遅い）
    await user.click(textbox());
    await user.paste('あ'.repeat(4001));
    await user.click(screen.getByRole('button', { name: SUBMIT }));
    expect(screen.getByRole('alert')).toHaveTextContent('4000文字まで');

    expect(send).not.toHaveBeenCalled();
    expect(textbox()).toBeInTheDocument();
  });

  it('送る関数が断る・例外を投げると、入力欄と文が残り、理由が出る。送っている間は「提案する」が押せない', async () => {
    const user = userEvent.setup();
    let resolve: (value: PostProposalResult) => void = () => {};
    const pending = new Promise<PostProposalResult>((r) => {
      resolve = r;
    });
    const send = vi
      .fn<SendProposal>()
      .mockReturnValueOnce(pending)
      .mockRejectedValueOnce(new Error('boom'));
    renderPlay(adventurerExam, { sendProposal: send });

    await openAndType(user, '質問');
    await user.click(screen.getByRole('button', { name: SUBMIT }));
    expect(screen.getByRole('button', { name: SUBMIT })).toBeDisabled();
    expect(card(approach.title)).toBeDisabled();
    resolve({ ok: false, message: 'ファイルを書けませんでした' });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '提案を保存できませんでした：ファイルを書けませんでした',
    );
    expect(textbox()).toHaveValue('質問');
    expect(screen.getByRole('button', { name: SUBMIT })).toBeEnabled();
    expect(screen.queryByText(AWAITING)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: SUBMIT }));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('alert')).toHaveTextContent('提案を保存できませんでした');
    expect(textbox()).toHaveValue('質問');
    expect(screen.queryByText(AWAITING)).not.toBeInTheDocument();
  });

  it('「やめる」で入力欄が閉じ、手札は今までどおり出せる', async () => {
    const user = userEvent.setup();
    renderPlay(adventurerExam);
    await openAndType(user, '書きかけ');
    await user.click(screen.getByRole('button', { name: 'やめる' }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(card(approach.title)).toBeEnabled();
    await user.click(card(approach.title));
    expect(await screen.findByRole('log')).toBeInTheDocument();
  });
});

// biome-ignore lint/correctness/usePlaywrightValidDescribeCallback: Vitest の describe は第2引数にオプション（tags）を取れる
describe('提案のカードの出方', { tags: ['rule:index/ビートの見せ方'] }, () => {
  it('会話のビートでは、台詞を読み切るまで提案のカードは出ず、読み切ると出る', async () => {
    const user = userEvent.setup();
    renderPlay(adventurerExam);
    expect(proposeCard()).toBeInTheDocument();
    await user.click(card(approach.title));
    await screen.findByRole('log');
    expect(proposeCard()).not.toBeInTheDocument();
    for (let i = 1; i < reception.lines.length; i++) {
      expect(proposeCard()).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: '次へ' }));
    }
    expect(proposeCard()).toBeInTheDocument();
  });
});

describe('提案のカードの出方（公開版・手札が空のビート）', () => {
  it('canPropose が偽なら提案のカードが出ない（手札は出る）', async () => {
    renderPlay(adventurerExam, { canPropose: false });
    expect(proposeCard()).not.toBeInTheDocument();
    expect(card(approach.title)).toBeInTheDocument();
  });

  it('手札が空のビート（exam-begins）でも、提案のカードが出て提案できる', async () => {
    const user = userEvent.setup();
    const send = sender();
    renderPlay(adventurerExam, { sendProposal: send });
    await toReceptionRead(user);
    await user.click(card(introduce.title));
    await user.type(screen.getByLabelText('キャラクターの名前'), 'アリサ');
    await user.click(screen.getByRole('button', { name: 'この名前で名乗る' }));
    const examBegins = adventurerExam.scenes[0]?.beats.find((b) => b.id === 'exam-begins');
    if (examBegins?.layout !== 'conversation') throw new Error('exam-begins');
    for (let i = 1; i < examBegins.lines.length; i++)
      await user.click(screen.getByRole('button', { name: '次へ' }));
    expect(screen.getByText('続きは準備中です。')).toBeInTheDocument();

    await openAndType(user, '続きが見たい');
    await user.click(screen.getByRole('button', { name: SUBMIT }));
    await screen.findByText(AWAITING);
    expect(send.mock.calls[0]?.[0]).toMatchObject({ text: '続きが見たい' });
  });
});

// biome-ignore lint/correctness/usePlaywrightValidDescribeCallback: Vitest の describe は第2引数にオプション（tags）を取れる
describe('提案待ち', { tags: ['rule:index/提案'] }, () => {
  it('一覧にあるビートに着くと最初から提案待ち。手札は押せず、提案のカードは押せる。重ねて提案でき、文が並ぶ', async () => {
    const user = userEvent.setup();
    const send = sender();
    renderPlay(adventurerExam, {
      sendProposal: send,
      proposals: [
        { scenarioId: 'adventurer-exam', beatId: 'entrance', summary: '前に出した提案' },
        { scenarioId: 'other', beatId: 'entrance', summary: '別のシナリオ' },
      ],
    });
    expect(screen.getByText(AWAITING)).toBeInTheDocument();
    expect(screen.getByText('「前に出した提案」')).toBeInTheDocument();
    expect(screen.queryByText('「別のシナリオ」')).not.toBeInTheDocument();
    expect(card(approach.title)).toBeDisabled();
    expect(screen.getByRole('button', { name: PROPOSE_CARD })).toBeEnabled();

    await openAndType(user, 'ひとつめ');
    await user.click(screen.getByRole('button', { name: SUBMIT }));
    await screen.findByText('「ひとつめ」');
    await openAndType(user, 'ふたつめ');
    await user.click(screen.getByRole('button', { name: SUBMIT }));
    await screen.findByText('「ふたつめ」');

    const awaiting = screen.getByRole('region', { name: '提案待ち' });
    expect(
      within(awaiting)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['「前に出した提案」', '「ひとつめ」', '「ふたつめ」']);
    expect(send.mock.calls[0]?.[0].events).toEqual([]);
    expect(send.mock.calls[1]?.[0].events).toEqual([
      { type: 'proposed', beatId: 'entrance', text: 'ひとつめ' },
    ]);
    expect(card(approach.title)).toBeDisabled();
  });
});

describe('名前の入力欄と提案の入力欄', () => {
  it('名前の入力欄を開いてから提案のカードを押すと名前の入力欄は閉じ、逆も同じ', async () => {
    const user = userEvent.setup();
    renderPlay(adventurerExam);
    await toReceptionRead(user);

    await user.click(card(introduce.title));
    expect(screen.getByLabelText('キャラクターの名前')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: PROPOSE_CARD }));
    expect(screen.queryByLabelText('キャラクターの名前')).not.toBeInTheDocument();
    expect(textbox()).toBeInTheDocument();

    await user.click(card(introduce.title));
    expect(textbox).toThrow();
    expect(screen.getByLabelText('キャラクターの名前')).toBeInTheDocument();
  });
});
