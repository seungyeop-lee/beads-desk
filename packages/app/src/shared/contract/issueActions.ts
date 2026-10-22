import type { DeferPeriod, IssueFieldChanges, Replacement } from "@beads-desk/bd/types";
import type { ApiFailure, ApiResponse } from "./apiResponse";
import type { EveryOrder } from "@/shared/domain/everyOrder";

export type { DeferPeriod, DeferUntil, Replacement } from "@beads-desk/bd/types";

/** 상세 화면에서 바꿀 수 있는 필드입니다. 빈 문자열은 그 필드를 비웁니다. 제목은 비울 수 없습니다. */
export type IssueChanges = IssueFieldChanges;

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

/** bd가 받는 우선순위 후보입니다. 0이 가장 높습니다. */
export const PRIORITIES = [0, 1, 2, 3, 4] as const;

/** 닫은 이슈 때문에 막혀 있다가 막힘이 풀린 이슈입니다. */
export type UnblockedIssue = { id: string; title: string };

export type CloseIssueResult =
  | ApiResponse<UnblockedIssue[]>
  /** 열린 하위 이슈나 닫히지 않은 선행 이슈가 있어 닫지 못했습니다. force로 다시 요청하면 닫습니다. */
  | (ApiFailure & { closeBlocked: true });

/** 화면에서 맺을 수 있는 bd 의존 유형입니다. */
export const LINKABLE_DEPENDENCY_TYPES = ["blocks", "parent-child", "related"] as const;

export type LinkableDependencyType = (typeof LINKABLE_DEPENDENCY_TYPES)[number];

/** 이슈를 닫으며 대상 이슈를 남기는 방법을 화면에 보이는 순서로 담습니다. bd의 Replacement 값을 빠짐없이 한 번씩 담아야 typecheck를 통과합니다. */
export const REPLACEMENTS = ["supersede", "duplicate"] as const satisfies EveryOrder<Replacement>;

/** 정해 둔 보류 기한을 화면에 보이는 순서로 담습니다. bd의 DeferPeriod 값을 빠짐없이 한 번씩 담아야 typecheck를 통과합니다. */
export const DEFER_PERIODS = [
  "tomorrow",
  "week",
  "indefinite",
] as const satisfies EveryOrder<DeferPeriod>;
