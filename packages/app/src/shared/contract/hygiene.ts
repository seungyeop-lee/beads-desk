import type { Issue } from "@beads-desk/bd/issue";

export const HYGIENE_PATH = "/api/hygiene";

/** 오래 방치된 이슈의 기준으로 고를 수 있는 일수입니다. 기본값은 bd stale과 같은 30일입니다. */
export const STALE_DAYS = [7, 14, 30] as const;
export type StaleDays = (typeof STALE_DAYS)[number];
export const DEFAULT_STALE_DAYS: StaleDays = 30;

/** 오래 방치된 이슈는 기준 일수를 바꿀 때 그 카드만 다시 읽도록 다른 경로로 읽습니다. */
export function staleIssuesPath(staleDays: StaleDays): string {
  return `${HYGIENE_PATH}/stale?${new URLSearchParams({ staleDays: String(staleDays) })}`;
}

/** 일수를 지정하지 않으면 기본값을 쓰고, 고를 수 없는 값이면 null을 돌려줍니다. */
export function parseStaleDays(params: URLSearchParams): StaleDays | null {
  const value = Number(params.get("staleDays") ?? DEFAULT_STALE_DAYS);
  return STALE_DAYS.find((days) => days === value) ?? null;
}

export type IssueRef = { id: string; title: string };

/** 정리 페이지의 점검 가운데 기준 일수와 관계없는 것의 결과입니다. */
export type HygieneReport = {
  /** 커밋 메시지에 id가 나오지만 아직 닫히지 않은 이슈입니다. */
  orphans: (IssueRef & { status: string; latestCommit: string; latestCommitMessage: string })[];
  /** bd가 권하는 섹션이 빠진 열린 이슈입니다. */
  lint: (IssueRef & { issueType: string; missing: string[] })[];
  /** 제목과 설명이 비슷한 닫히지 않은 이슈 쌍입니다. */
  duplicates: [IssueRef, IssueRef][];
  closableEpics: Issue[];
};
