// 冒険者登録の試験のシナリオ。JSON をスキーマで読み、参照の切れがあれば読み込みで止める
import raw from './adventurer-exam.json';
import { scenarioSchema } from './model';

export const adventurerExam = scenarioSchema.parse(raw);
