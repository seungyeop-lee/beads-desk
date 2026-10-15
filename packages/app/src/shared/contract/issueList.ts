import { ISSUE_STATUSES, type IssueStatus } from "@beads-desk/bd/issue";

export const ISSUE_LIST_PATH = "/api/issues";

/** 설명에 검색어가 든 이슈의 id 목록을 돌려주는 경로입니다. /api/issues/[id]와 겹치지 않도록 따로 둡니다. */
export const ISSUE_SEARCH_PATH = "/api/issue-search";

/**
 * 이슈 목록 조회 조건입니다.
 * ready는 저장 상태가 아니라 bd가 계산하는 "막힌 것 없이 바로 작업할 수 있는 이슈" 목록이라 다른 상태와 함께 고를 수 없습니다.
 * 상태를 하나도 고르지 않으면 모든 상태를 조회합니다.
 */
export type IssueListFilter = { kind: "ready" } | { kind: "status"; statuses: IssueStatus[] };

const READY = "ready";

export function issueListSearchParams(filter: IssueListFilter): URLSearchParams {
  const status = filter.kind === "ready" ? READY : filter.statuses.join(",");
  return new URLSearchParams(status ? { status } : {});
}

/** query가 올바르지 않으면 null을 돌려줍니다. */
export function parseIssueListFilter(params: URLSearchParams): IssueListFilter | null {
  const status = params.get("status");
  if (!status) return { kind: "status", statuses: [] };
  if (status === READY) return { kind: "ready" };

  const statuses = status.split(",");
  return statuses.every(isIssueStatus) ? { kind: "status", statuses } : null;
}

function isIssueStatus(value: string): value is IssueStatus {
  return (ISSUE_STATUSES as readonly string[]).includes(value);
}

export function descriptionSearchPath(text: string): string {
  return `${ISSUE_SEARCH_PATH}?${new URLSearchParams({ description: text })}`;
}

/** 검색어가 없거나 공백뿐이면 null을 돌려줍니다. */
export function parseDescriptionSearch(params: URLSearchParams): string | null {
  const text = params.get("description")?.trim() ?? "";
  return text === "" ? null : text;
}
