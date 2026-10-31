// apps/web/vite/ が trace.mjs を import するための型（.mjs には型が無く、tsc が TS7016 にするため）。
export interface ProposalFile {
  scenario: string;
  beat: string;
  status: string;
  summary: string;
}
export function frontmatterValue(source: string, key: string): string;
export function frontmatterNested(source: string, key: string): Record<string, string> | null;
export function parseProposalFile(source: string): ProposalFile | null;
