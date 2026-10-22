import type { IssueStatus } from "@beads-desk/bd/issue";

/** decision은 열려 있으면 유효한 결정이고 닫히면 폐기되거나 대체된 결정이라, 작업 진행을 나타내는 상태는 고르지 않습니다. */
export const DECISION_STATUSES: readonly IssueStatus[] = ["open", "closed"];
