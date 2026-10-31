// POST /proposals の応答（docs/plans/2026-10-31-P6-提案の保存.md D7）。domain に無い形だけ

import { z } from 'zod';

/** 書いた要望のファイル。書く先のディレクトリの親の親からの `/` 区切りのパス（既定では `docs/backlog/proposal-….md`） */
export const proposalCreatedSchema = z.strictObject({ file: z.string() });
