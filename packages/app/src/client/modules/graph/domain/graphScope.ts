import type { Issue, IssueDependency } from "@beads-desk/bd/issue";
import type { GraphData } from "@/shared/contract/graph";

/**
 * 의존 그래프가 그리는 범위입니다.
 * epic은 그 에픽의 후손 이슈를, center는 앞뒤 blocks 사슬과 기준에 직접 연결된 related·discovered-from 이슈를 그립니다.
 */
export type GraphScope = { kind: "epic" | "center"; id: string };

/**
 * 범위에 드는 이슈를 고릅니다. 범위를 여는 이슈 자신은 에픽 보기에서는 빼고, 이슈 중심 보기에서는 담습니다.
 * 두 보기 모두 어디까지 진행했는지 보이도록 닫힌 이슈도 담습니다.
 */
export function scopedIssues(
  { issues, dependencies, ancestorEpics }: GraphData,
  scope: GraphScope,
): Issue[] {
  if (scope.kind === "epic") {
    return issues.filter((issue) => ancestorEpics[issue.id]?.includes(scope.id));
  }
  const selected = new Set(blockingChainIssues(issues, dependencies, scope.id).map(({ id }) => id));
  for (const { issueId, dependsOnId, type } of dependencies) {
    if (type !== "related" && type !== "discovered-from") continue;
    if (issueId === scope.id) selected.add(dependsOnId);
    if (dependsOnId === scope.id) selected.add(issueId);
  }
  return issues.filter(({ id }) => selected.has(id));
}

export function blockingChainIssues(
  issues: Issue[],
  dependencies: IssueDependency[],
  centerId: string,
): Issue[] {
  const ids = new Set(issues.map((issue) => issue.id));
  const blockersOf = new Map<string, string[]>();
  const waitersOf = new Map<string, string[]>();
  for (const { issueId, dependsOnId, type } of dependencies) {
    if (type !== "blocks" || !ids.has(issueId) || !ids.has(dependsOnId)) continue;
    blockersOf.set(issueId, [...(blockersOf.get(issueId) ?? []), dependsOnId]);
    waitersOf.set(dependsOnId, [...(waitersOf.get(dependsOnId) ?? []), issueId]);
  }
  const chain = new Set([
    centerId,
    ...reachable(centerId, blockersOf),
    ...reachable(centerId, waitersOf),
  ]);
  return issues.filter((issue) => chain.has(issue.id));
}

/** 한 방향으로만 따라가므로, 선행 이슈의 다른 후속 이슈처럼 사슬 옆으로 갈라진 이슈는 담지 않습니다. */
function reachable(start: string, next: ReadonlyMap<string, string[]>): Set<string> {
  const reached = new Set<string>();
  const pending = [start];
  while (pending.length > 0) {
    for (const id of next.get(pending.pop()!) ?? []) {
      // 순환이 있어도 이미 만난 이슈는 다시 따라가지 않습니다.
      if (reached.has(id)) continue;
      reached.add(id);
      pending.push(id);
    }
  }
  return reached;
}
