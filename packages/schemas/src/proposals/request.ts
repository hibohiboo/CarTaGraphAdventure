// POST /proposals の本文（docs/plans/2026-10-31-P6-提案の保存.md D7）。書くのは形だけ。文の決まり・列の中身の検査は受け取る側（ドメインの propose）

import { playEventSchema } from '@cartagraph/domain/scenario/model';
import { z } from 'zod';
import { defineBody } from '../body/parse';

export const proposalBody = defineBody(
  z.strictObject({
    scenarioId: z.string(),
    text: z.string(),
    /** この提案の前までの、遊んだことのイベントの列 */
    events: z.array(playEventSchema),
  }),
  {
    scenarioId: 'scenarioId は文字列で指定してください',
    text: 'text は文字列で指定してください',
    events: 'events はイベントの配列で指定してください',
  },
);
