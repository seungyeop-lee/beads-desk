import type { Issue } from "@beads-desk/bd/issue";
import { workState, type WorkState } from "@/client/modules/issues/domain/workState";

/** 의존 그래프의 모든 탭이 함께 쓰는 필터입니다. 닫힌 이슈 포함 여부는 서버가 읽을 때 정합니다. */
export type GraphFilter = {
  /** 이 에픽의 후손만 남깁니다. null이면 거르지 않습니다. */
  epic: string | null;
  /** 비어 있으면 모든 유형을 남깁니다. */
  types: readonly string[];
  /** 결정 bd-desk-2s1의 작업 상태입니다. 비어 있으면 모든 상태를 남깁니다. */
  states: readonly WorkState[];
};

export function filterGraphIssues(issues: Issue[], { epic, types, states }: GraphFilter): Issue[] {
  const inEpic = epic === null ? null : descendantIds(issues, epic);
  return issues.filter(
    (issue) =>
      (inEpic === null || inEpic.has(issue.id)) &&
      (types.length === 0 || types.includes(issue.issueType)) &&
      (states.length === 0 || states.includes(workState(issue))),
  );
}

/** parent를 따라 rootId 아래의 모든 이슈를 모읍니다. rootId 자신은 넣지 않습니다. */
function descendantIds(issues: Issue[], rootId: string): Set<string> {
  const children = new Map<string, string[]>();
  for (const { id, parent } of issues) {
    if (parent) children.set(parent, [...(children.get(parent) ?? []), id]);
  }
  const reached = new Set([rootId]);
  const pending = [rootId];
  while (pending.length > 0) {
    for (const child of children.get(pending.pop()!) ?? []) {
      // 상위 관계가 순환해도 같은 이슈를 다시 따라가지 않습니다.
      if (reached.has(child)) continue;
      reached.add(child);
      pending.push(child);
    }
  }
  reached.delete(rootId);
  return reached;
}
