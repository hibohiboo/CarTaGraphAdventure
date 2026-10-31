import { adventurerExam } from '@cartagraph/domain/scenario/adventurer-exam';
import { Playthrough } from './Playthrough';

// 冒険者登録の試験。遊ぶ画面は Playthrough が持つ
export function ExamPage() {
  return <Playthrough scenario={adventurerExam} />;
}
