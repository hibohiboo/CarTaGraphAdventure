// apps/web のテストが check-trace.mjs を import するための型（.mjs には型が無く、tsc が TS7016 にするため）。
export interface TraceInputs {
  backlog: { file: string; source: string }[];
  [key: string]: unknown;
}
export function findTraceProblems(inputs: TraceInputs): string[];
export function readTraceInputs(): TraceInputs;
