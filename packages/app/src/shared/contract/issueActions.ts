import type { ApiFailure, ApiResponse } from "./apiResponse";

/** 상세 화면에서 바꿀 수 있는 필드입니다. 빈 문자열은 그 필드를 비웁니다. 제목은 비울 수 없습니다. */
export type IssueChanges = {
  title?: string;
  description?: string;
  design?: string;
  acceptanceCriteria?: string;
  notes?: string;
  assignee?: string;
  /** 0(긴급)부터 4(백로그)까지입니다. */
  priority?: number;
};

export type NewIssueInput = {
  title: string;
  /** null이면 bd 기본 유형을 씁니다. */
  issueType: string | null;
  /** null이면 bd 기본 우선순위를 씁니다. */
  priority: number | null;
  description: string;
  labels: string[];
  /** null이면 상위 이슈 없이 만듭니다. */
  parent: string | null;
};

/** 닫은 이슈 때문에 막혀 있다가 막힘이 풀린 이슈입니다. */
export type UnblockedIssue = { id: string; title: string };

export type CloseIssueResult =
  | ApiResponse<UnblockedIssue[]>
  /** 열린 하위 이슈나 닫히지 않은 선행 이슈가 있어 닫지 못했습니다. force로 다시 요청하면 닫습니다. */
  | (ApiFailure & { closeBlocked: true });

/** 화면에서 맺을 수 있는 bd 의존 유형입니다. */
export const LINKABLE_DEPENDENCY_TYPES = ["blocks", "parent-child", "related"] as const;

export type LinkableDependencyType = (typeof LINKABLE_DEPENDENCY_TYPES)[number];
