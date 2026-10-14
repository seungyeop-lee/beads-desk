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
