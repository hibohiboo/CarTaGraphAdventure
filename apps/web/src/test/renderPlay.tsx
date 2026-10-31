import type { Scenario } from '@cartagraph/domain/scenario/model';
import type { PendingProposal } from '@cartagraph/domain/scenario/proposal';
import { render } from '@testing-library/react';
import type { SendProposal } from '@/entities/proposal/api/postProposal';
import { Playthrough } from '@/pages/pl/exam/ui/Playthrough';

interface Options {
  proposals?: PendingProposal[];
  canPropose?: boolean;
  sendProposal?: SendProposal;
}

// 呼ばれたら失敗する送る関数。「常に成功」にすると、送らない実装でも通ってしまう
const failIfCalled: SendProposal = () => {
  throw new Error('sendProposal が呼ばれた（このテストは送らないはず）');
};

// シナリオを渡して Playthrough を描く。描画ごとに作り直す（docs/process/rules/testing.md「テストの独立性」）
export function renderPlay(scenario: Scenario, options: Options = {}) {
  return render(
    <Playthrough
      scenario={scenario}
      proposals={options.proposals ?? []}
      canPropose={options.canPropose ?? true}
      sendProposal={options.sendProposal ?? failIfCalled}
    />,
  );
}
