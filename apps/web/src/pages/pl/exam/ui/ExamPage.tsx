import proposals from 'virtual:proposals';
import { adventurerExam } from '@cartagraph/domain/scenario/adventurer-exam';
import { postProposal } from '@/entities/proposal/api/postProposal';
import { Playthrough } from './Playthrough';

// 冒険者登録の試験。遊ぶ画面は Playthrough が持つ。
// 提案のカードは開発サーバーのときだけ出す（口は開発サーバーにしか無い。Vitest でも真）。提案待ちの止めは公開版でも効く
export function ExamPage() {
  return (
    <Playthrough
      scenario={adventurerExam}
      proposals={proposals}
      canPropose={import.meta.env.DEV}
      sendProposal={postProposal}
    />
  );
}
