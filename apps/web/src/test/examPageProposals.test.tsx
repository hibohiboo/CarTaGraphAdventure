// ExamPage の配線：virtual:proposals の提案待ちの一覧が、シナリオの id で絞られて Playthrough に届く
// （docs/plans/2026-10-31-P6-提案の保存.md D5・D6・テスト38）
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderAt } from './renderAt';

vi.mock('virtual:proposals', () => ({
  default: [
    { scenarioId: 'adventurer-exam', beatId: 'reception', summary: '受付での提案' },
    { scenarioId: 'other-scenario', beatId: 'entrance', summary: '別のシナリオの提案' },
  ],
}));

describe('ExamPage の提案待ち', () => {
  it('一覧にある受付に着くと、最初から提案待ち。別のシナリオの提案では入口は止まらない', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(screen.getByRole('link', { name: '試験を受ける' }));
    const approach = await screen.findByRole('button', { name: /受付へ進む/ });
    expect(approach).toBeEnabled();
    expect(screen.queryByText(/提案待ち/)).not.toBeInTheDocument();

    await user.click(approach);
    await screen.findByRole('log');
    const next = () => screen.queryByRole('button', { name: '次へ' });
    while (next()) await user.click(next() as HTMLElement);

    expect(
      screen.getByText('提案待ち：提案が取り込まれるか見送られるまで、手札は出せません'),
    ).toBeInTheDocument();
    expect(screen.getByText('「受付での提案」')).toBeInTheDocument();
    expect(screen.queryByText('「別のシナリオの提案」')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /名乗る/ })).toBeDisabled();
  });
});
