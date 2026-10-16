import type { Issue, IssueDetail, IssueLink } from "@beads-desk/bd/issue";
import type { LinkableDependencyType } from "@/shared/contract/issueActions";

/** 상세에서 지금 이슈를 기준으로 고르는 관계입니다. */
export const RELATION_KINDS = ["blockedBy", "blocks", "parent", "child", "related"] as const;

export type RelationKind = (typeof RELATION_KINDS)[number];

export type DependencyToAdd = {
  issueId: string;
  dependsOnId: string;
  type: LinkableDependencyType;
};

/** 결정은 여러 이슈에 걸친 합의를 기록하므로 상하위 관계(parent-child)에 넣지 않습니다. 관련(related) 관계로는 연결합니다. */
export function canJoinHierarchy(issue: Pick<Issue, "issueType">): boolean {
  return issue.issueType !== "decision";
}

/** 관계 맺기에서 고른 관계의 후보로 쓸 수 없는 이슈를 고릅니다. 이미 연결한 이슈와, 상위·하위 관계일 때의 결정입니다. */
export function notRelationCandidate(
  kind: RelationKind,
  linked: ReadonlySet<string>,
): (issue: Issue) => boolean {
  const hierarchy = kind === "parent" || kind === "child";
  return (issue) => linked.has(issue.id) || (hierarchy && !canJoinHierarchy(issue));
}

/** 대체·중복으로 닫을 대상의 후보로 쓸 수 없는 이슈를 고릅니다. 자기 자신과, 이 이슈가 이미 의존하는 이슈는 bd가 거부합니다. 반대 방향으로 연결된 이슈는 고를 수 있습니다. */
export function notReplacementTarget(
  issue: Pick<IssueDetail, "id" | "dependencies">,
): (candidate: Issue) => boolean {
  const unavailable = new Set([issue.id, ...issue.dependencies.map((link) => link.id)]);
  return (candidate) => unavailable.has(candidate.id);
}

/** 고른 관계를 bd dep add의 (의존하는 이슈, 의존받는 이슈, 유형)으로 바꿉니다. parent-child는 하위 이슈가 상위 이슈에 의존합니다. */
export function dependencyToAdd(kind: RelationKind, self: string, other: string): DependencyToAdd {
  switch (kind) {
    case "blockedBy":
      return { issueId: self, dependsOnId: other, type: "blocks" };
    case "blocks":
      return { issueId: other, dependsOnId: self, type: "blocks" };
    case "parent":
      return { issueId: self, dependsOnId: other, type: "parent-child" };
    case "child":
      return { issueId: other, dependsOnId: self, type: "parent-child" };
    case "related":
      return { issueId: self, dependsOnId: other, type: "related" };
  }
}

/** 이 이슈를 기다리거나 이 이슈가 기다리는 blocks 관계가 있으면, 선행·후속 그래프로 그릴 사슬이 있습니다. */
export function hasBlocksLink(issue: Pick<IssueDetail, "dependencies" | "dependents">): boolean {
  return [...issue.dependencies, ...issue.dependents].some(
    (link) => link.dependencyType === "blocks",
  );
}

/** 상세의 연결된 이슈 한 줄입니다. side는 bd 상세의 어느 목록에서 왔는지를 뜻하며, 줄 라벨과 관계를 지우는 방향을 정합니다. */
export type LinkedIssue = { side: "dependencies" | "dependents"; link: IssueLink };

/**
 * 연결된 이슈의 줄 순서입니다. 대체한 이슈, 원본, 상위, 선행, 후속, 하위, 관련, 발견 출처, 여기서 발견, 대체된 이슈, 중복 순입니다.
 * 대체한 이슈와 원본은 이 이슈가 왜 닫혔는지 알려 주므로 맨 앞에 둡니다.
 */
const LINKED_ORDER = [
  "dependencies:supersedes",
  "dependencies:duplicates",
  "dependencies:parent-child",
  "dependencies:blocks",
  "dependents:blocks",
  "dependents:parent-child",
  "dependencies:related",
  "dependents:related",
  "dependencies:discovered-from",
  "dependents:discovered-from",
  "dependents:supersedes",
  "dependents:duplicates",
];

/** 이 이슈가 의존하는 이슈와 이 이슈에 의존하는 이슈를 한 목록으로 합칩니다. 같은 관계 안에서는 받은 순서를 지키고, 모르는 의존 유형은 맨 뒤에 둡니다. */
export function linkedIssues(
  issue: Pick<IssueDetail, "dependencies" | "dependents">,
): LinkedIssue[] {
  const rows: LinkedIssue[] = [
    ...issue.dependencies.map((link) => ({ side: "dependencies" as const, link })),
    ...issue.dependents.map((link) => ({ side: "dependents" as const, link })),
  ];
  return rows.sort((a, b) => linkedRank(a) - linkedRank(b));
}

function linkedRank({ side, link }: LinkedIssue): number {
  const rank = LINKED_ORDER.indexOf(`${side}:${link.dependencyType}`);
  return rank === -1 ? LINKED_ORDER.length : rank;
}
