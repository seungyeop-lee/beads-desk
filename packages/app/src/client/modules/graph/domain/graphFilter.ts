import type { Issue } from "@beads-desk/bd/issue";
import { workState, type WorkState } from "@/client/modules/issues/domain/workState";

/** 에픽 소속으로 거르는 조건입니다. all은 거르지 않고, epic은 그 에픽의 후손만 남깁니다. */
export type EpicFilter =
  | { kind: "all" }
  | { kind: "inEpic" }
  | { kind: "noEpic" }
  | { kind: "epic"; id: string };

/** 의존 그래프의 모든 탭이 함께 쓰는 필터입니다. 닫힌 이슈 포함 여부는 서버가 읽을 때 정합니다. */
export type GraphFilter = {
  epic: EpicFilter;
  /** 비어 있으면 모든 유형을 남깁니다. */
  types: readonly string[];
  /** 남길 작업 상태입니다. 비어 있으면 모든 상태를 남깁니다. */
  states: readonly WorkState[];
};

/** ancestorEpics는 이슈마다 parent를 따라 올라가며 만나는 에픽 id입니다. 에픽에 속하지 않은 이슈는 담지 않습니다. */
export function filterGraphIssues(
  issues: Issue[],
  ancestorEpics: Record<string, string[]>,
  { epic, types, states }: GraphFilter,
): Issue[] {
  return issues.filter(
    (issue) =>
      matchesEpic(issue, ancestorEpics[issue.id] ?? [], epic) &&
      (types.length === 0 || types.includes(issue.issueType)) &&
      (states.length === 0 || states.includes(workState(issue))),
  );
}

function matchesEpic(issue: Issue, epics: string[], filter: EpicFilter): boolean {
  switch (filter.kind) {
    case "all":
      return true;
    case "inEpic":
      return epics.length > 0;
    case "noEpic":
      // 에픽 자신은 에픽에 속하지 않았어도 묶는 쪽이므로 뺍니다.
      return epics.length === 0 && issue.issueType !== "epic";
    case "epic":
      return epics.includes(filter.id);
  }
}
