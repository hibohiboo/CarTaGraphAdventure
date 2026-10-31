// 会話エリアに出す履歴（docs/cartagraph/index.md「ビートの見せ方」）
import type { LogEntry, PlayState, Scenario } from './model';
import { locateBeat } from './transition';

/**
 * ログの末尾から、いまのビートと同じシーンの行が続く間だけを遡り、会話のビートの行
 * （NPC の台詞と、会話のビートで出したカードの自分の台詞）を古い順に返す。
 * 紙面のビートの行は返さないが、遡りは止めない。別のシーンの行に当たったら止める
 */
export const conversationHistory = (scenario: Scenario, state: PlayState): LogEntry[] => {
  const current = locateBeat(scenario, state.beatId);
  if (!current) throw new Error(`ビートが見つからない：${state.beatId}`);
  const history: LogEntry[] = [];
  for (let i = state.log.length - 1; i >= 0; i--) {
    const entry = state.log[i];
    if (!entry) continue;
    const located = locateBeat(scenario, entry.beatId);
    if (!located) throw new Error(`ログの行のビートが見つからない：${entry.beatId}`);
    if (located.scene.id !== current.scene.id) break;
    if (located.beat.layout === 'conversation') history.push(entry);
  }
  return history.reverse();
};
