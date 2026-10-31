// 冒険者登録の試験のシナリオ。JSON をスキーマで読み、参照の切れがあれば読み込みで止める
// import 属性は、Playwright（Node の ESM）が属性の無い JSON の import を断るため
import raw from './adventurer-exam.json' with { type: 'json' };
import { scenarioSchema } from './model';

export const adventurerExam = scenarioSchema.parse(raw);
