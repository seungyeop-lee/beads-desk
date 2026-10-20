import { ISSUE_STATUSES, type IssueStatus } from "@beads-desk/bd/issue";
import type { BodyField } from "@/shared/domain/issues/bodyFields";

export const ISSUE_LIST_PATH = "/api/issues";

/** 본문 필드나 댓글에 검색어가 든 이슈를 돌려주는 경로입니다. /api/issues/[id]와 겹치지 않도록 따로 둡니다. */
const ISSUE_SEARCH_PATH = "/api/issue-search";

/**
 * 이슈 목록 조회 조건입니다.
 * ready는 저장 상태가 아니라 bd가 계산하는 "막힌 것 없이 바로 작업할 수 있는 이슈" 목록이라 다른 상태와 함께 고를 수 없습니다.
 * 상태를 하나도 고르지 않으면 모든 상태를 조회합니다.
 */
export type IssueListFilter = { kind: "ready" } | { kind: "status"; statuses: IssueStatus[] };

export const ALL_STATUSES: IssueListFilter = { kind: "status", statuses: [] };

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

/** 저장 상태 후보에 든 값인지 검사합니다. Server Action 입력 검사에서도 같은 정의를 씁니다. */
export function isIssueStatus(value: unknown): value is IssueStatus {
  return (ISSUE_STATUSES as readonly unknown[]).includes(value);
}

/** 검색어가 든 곳입니다. comment가 아니면 상세 화면의 본문 필드 이름입니다. */
export type IssueTextHitField = BodyField | "comment";

/** 검색어가 든 곳 하나와, 그곳에서 검색어 주변을 잘라 낸 짧은 발췌입니다. */
export type IssueTextHit = { field: IssueTextHitField; excerpt: string };

/** 본문 필드나 댓글에 검색어가 든 이슈 하나입니다. hits에는 맞은 곳을 앞에서부터 몇 곳만 담습니다. */
export type IssueTextMatch = { id: string; hits: IssueTextHit[] };

export function issueTextSearchPath(text: string): string {
  return `${ISSUE_SEARCH_PATH}?${new URLSearchParams({ text })}`;
}

/** 검색어가 없거나 공백뿐이면 null을 돌려줍니다. */
export function parseIssueTextSearch(params: URLSearchParams): string | null {
  const text = params.get("text")?.trim() ?? "";
  return text === "" ? null : text;
}
