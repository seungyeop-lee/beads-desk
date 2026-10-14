import type { IssueDetail, IssueLink } from "@beads-desk/bd/issue";
import type { LinkableDependencyType } from "@/shared/contract/issueActions";

/** 상세에서 지금 이슈를 기준으로 고르는 관계입니다. */
export const RELATION_KINDS = ["blockedBy", "blocks", "parent", "child", "related"] as const;

export type RelationKind = (typeof RELATION_KINDS)[number];

export type DependencyToAdd = {
  issueId: string;
  dependsOnId: string;
  type: LinkableDependencyType;
};

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

/** 상세의 연결된 이슈 한 줄입니다. side는 bd 상세의 어느 목록에서 왔는지를 뜻하며, 줄 라벨과 관계를 지우는 방향을 정합니다. */
export type LinkedIssue = { side: "dependencies" | "dependents"; link: IssueLink };

/** 연결된 이슈의 줄 순서입니다. 상위, 선행, 후속, 하위, 관련, 발견 출처, 여기서 발견 순입니다. */
const LINKED_ORDER = [
  "dependencies:parent-child",
  "dependencies:blocks",
  "dependents:blocks",
  "dependents:parent-child",
  "dependencies:related",
  "dependents:related",
  "dependencies:discovered-from",
  "dependents:discovered-from",
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
