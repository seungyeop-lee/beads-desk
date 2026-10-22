import type { Issue } from "@beads-desk/bd/issue";

/** 이슈마다 parent를 따라 올라가며 만나는 에픽 id를 가까운 것부터 담습니다. 에픽에 속하지 않은 이슈는 담지 않습니다. */
export function ancestorEpicsOf(issues: readonly Issue[]): Record<string, string[]> {
  const byId = new Map(issues.map((issue) => [issue.id, issue]));
  const ancestorEpics: Record<string, string[]> = {};
  for (const issue of issues) {
    const epics: string[] = [];
    const reached = new Set([issue.id]);
    let ancestor = issue.parent ? byId.get(issue.parent) : undefined;
    // 상위 관계가 순환해도 같은 이슈를 다시 따라가지 않습니다.
    while (ancestor && !reached.has(ancestor.id)) {
      reached.add(ancestor.id);
      if (ancestor.issueType === "epic") epics.push(ancestor.id);
      ancestor = ancestor.parent ? byId.get(ancestor.parent) : undefined;
    }
    if (epics.length > 0) ancestorEpics[issue.id] = epics;
  }
  return ancestorEpics;
}
