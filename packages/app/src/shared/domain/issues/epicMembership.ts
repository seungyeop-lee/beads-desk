import type { Issue } from "@beads-desk/bd/issue";

export type EpicAncestors = Readonly<Record<string, Pick<Issue, "id" | "title">>>;

/** 자신은 포함하지 않고, 부모를 따라 처음 만나는 epic의 링크 정보를 돌려줍니다. */
export function nearestEpicAncestors(issues: readonly Issue[]): EpicAncestors {
  const byId = new Map(issues.map((issue) => [issue.id, issue]));
  const ancestors: Record<string, Pick<Issue, "id" | "title">> = {};
  for (const issue of issues) {
    const reached = new Set([issue.id]);
    let parent = issue.parent ? byId.get(issue.parent) : undefined;
    while (parent && !reached.has(parent.id)) {
      if (parent.issueType === "epic") {
        ancestors[issue.id] = { id: parent.id, title: parent.title };
        break;
      }
      reached.add(parent.id);
      parent = parent.parent ? byId.get(parent.parent) : undefined;
    }
  }
  return ancestors;
}
