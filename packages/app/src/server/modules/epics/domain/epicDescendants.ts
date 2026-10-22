import type { Issue } from "@beads-desk/bd/issue";

/**
 * 이슈 목록에서 epic 아래의 모든 후손 이슈(하위 이슈와 그 하위 이슈들)를 parent를 따라 모읍니다.
 * bd children은 직접 하위 이슈만 돌려주므로, 모든 이슈를 한 번에 읽은 목록을 넘깁니다.
 */
export function epicDescendants(issues: readonly Issue[], epicId: string): Issue[] {
  const childrenByParent = groupByParent(issues);
  const descendants: Issue[] = [];
  const reached = new Set([epicId]);
  const pending = [epicId];
  while (pending.length > 0) {
    for (const child of childrenByParent.get(pending.shift()!) ?? []) {
      // 상위 관계가 순환해도 같은 이슈를 두 번 담지 않습니다.
      if (reached.has(child.id)) continue;
      reached.add(child.id);
      descendants.push(child);
      pending.push(child.id);
    }
  }
  return descendants;
}

function groupByParent(issues: readonly Issue[]): Map<string, Issue[]> {
  const childrenByParent = new Map<string, Issue[]>();
  for (const issue of issues) {
    if (issue.parent) {
      childrenByParent.set(issue.parent, [...(childrenByParent.get(issue.parent) ?? []), issue]);
    }
  }
  return childrenByParent;
}
