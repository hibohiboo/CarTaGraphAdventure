// 試験のシーンで名乗る（docs/plans/2026-10-31-P4-試験の最初のシーン.md D5・D6・テスト10〜17）
import { adventurerExam } from '@cartagraph/domain/scenario/adventurer-exam';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderAt } from './renderAt';

const reception = adventurerExam.scenes.find((scene) => scene.id === adventurerExam.start)!;
const introduce = reception.hand.find((card) => card.asksCharacterName)!;
const examBegins = adventurerExam.scenes.find((scene) => scene.id === introduce.next)!;
// 名前の入った文の期待値。実装と同じ renderText では作らない
const withName = (text: string, name: string) => text.split('{characterName}').join(name);

const NAME_LABEL = 'キャラクターの名前';
const CONFIRM = 'この名前で名乗る';
const NOT_READY = '続きは準備中です。';

const openReception = async () => {
  const user = userEvent.setup();
  renderAt('/');
  await user.click(screen.getByRole('link', { name: '試験を受ける' }));
  await screen.findByRole('heading', { level: 1, name: reception.title });
  return user;
};

const introduceWith = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
  await user.click(screen.getByRole('button', { name: new RegExp(introduce.title) }));
  if (name !== '') await user.type(screen.getByLabelText(NAME_LABEL), name);
  await user.click(screen.getByRole('button', { name: CONFIRM }));
};

describe('試験のシーンで名乗る', () => {
  it('ホームの「試験を受ける」から受付のシーンに入り、段落が出る。初めは理由も入力欄も無い', async () => {
    await openReception();
    for (const paragraph of reception.text) expect(screen.getByText(paragraph)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(NAME_LABEL)).not.toBeInTheDocument();
    expect(screen.queryByText(NOT_READY)).not.toBeInTheDocument();
  });

  it('名乗るを押すと入力欄が出て、名前を確定すると次のシーンで名前を呼ばれる', async () => {
    const user = await openReception();
    await user.click(screen.getByRole('button', { name: new RegExp(introduce.title) }));
    expect(screen.getByLabelText(NAME_LABEL)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(reception.title);

    await user.type(screen.getByLabelText(NAME_LABEL), 'アリサ{Enter}');
    await screen.findByRole('heading', { level: 1, name: examBegins.title });
    expect(screen.getByText(withName(examBegins.text[0]!, 'アリサ'))).toBeInTheDocument();
    expect(screen.queryByText(/\{characterName\}/)).not.toBeInTheDocument();
    expect(screen.getByText(NOT_READY)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: new RegExp(introduce.title) }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(NAME_LABEL)).not.toBeInTheDocument();
  });

  it('空白だけで確定すると理由が出て受付のまま。直して確定すると進み、理由は消える', async () => {
    const user = await openReception();
    await introduceWith(user, '　 ');
    expect(screen.getByRole('alert')).toHaveTextContent('名前を書いてください');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(reception.title);
    expect(screen.getByLabelText(NAME_LABEL)).toHaveValue('　 ');

    await user.clear(screen.getByLabelText(NAME_LABEL));
    await user.type(screen.getByLabelText(NAME_LABEL), 'アリサ');
    await user.click(screen.getByRole('button', { name: CONFIRM }));
    await screen.findByRole('heading', { level: 1, name: examBegins.title });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('11文字を確定すると、長すぎる理由が出て受付のまま', async () => {
    const user = await openReception();
    await introduceWith(user, 'ア'.repeat(11));
    expect(screen.getByRole('alert')).toHaveTextContent('名前は10文字までです');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(reception.title);
  });

  it('確定を2回続けて押しても、次のシーンのまま理由が出ない', async () => {
    const user = await openReception();
    await user.click(screen.getByRole('button', { name: new RegExp(introduce.title) }));
    await user.type(screen.getByLabelText(NAME_LABEL), 'アリサ');
    await user.dblClick(screen.getByRole('button', { name: CONFIRM }));
    await screen.findByRole('heading', { level: 1, name: examBegins.title });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('名前の HTML は文字のまま出る', async () => {
    const user = await openReception();
    await introduceWith(user, '<b>x</b>');
    await screen.findByRole('heading', { level: 1, name: examBegins.title });
    expect(screen.getByText(withName(examBegins.text[0]!, '<b>x</b>'))).toBeInTheDocument();
    expect(document.querySelector('main b')).toBeNull();
  });

  it('提案は準備中（仮）とどのシーンにも出て、提案のボタンは無い', async () => {
    const user = await openReception();
    const assertNoProposal = () => {
      expect(screen.getByText('GM への提案は準備中です（仮）')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /提案/ })).not.toBeInTheDocument();
    };
    assertNoProposal();
    await introduceWith(user, 'アリサ');
    await screen.findByRole('heading', { level: 1, name: examBegins.title });
    assertNoProposal();
  });

  it('次のシーンまで進んでから描き直すと、受付に戻る', async () => {
    const user = await openReception();
    await introduceWith(user, 'アリサ');
    await screen.findByRole('heading', { level: 1, name: examBegins.title });
    cleanup();
    renderAt('/exam');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(reception.title);
  });
});
