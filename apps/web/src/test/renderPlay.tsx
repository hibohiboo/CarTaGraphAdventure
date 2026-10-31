import type { Scenario } from '@cartagraph/domain/scenario/model';
import { render } from '@testing-library/react';
import { Playthrough } from '@/pages/pl/exam/ui/Playthrough';

// シナリオを渡して Playthrough を描く。描画ごとに作り直す（docs/process/rules/testing.md「テストの独立性」）
export function renderPlay(scenario: Scenario) {
  return render(<Playthrough scenario={scenario} />);
}
