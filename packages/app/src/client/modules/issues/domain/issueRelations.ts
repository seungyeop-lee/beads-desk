import {
  isOpenHumanGateLink,
  type Issue,
  type IssueDetail,
  type IssueLink,
} from "@beads-desk/bd/issue";
import type { LinkableDependencyType } from "@/shared/contract/issueActions";

/** 상세에서 지금 이슈를 기준으로 고르는 관계입니다. */
export const RELATION_KINDS = ["blockedBy", "blocks", "parent", "child", "related"] as const;

export type RelationKind = (typeof RELATION_KINDS)[number];

export type DependencyToAdd = {
  issueId: string;
  dependsOnId: string;
  type: LinkableDependencyType;
};

/** 대체·중복으로 닫을 대상의 후보로 쓸 수 없는 이슈를 고릅니다. 자기 자신과, 이 이슈가 이미 의존하는 이슈는 bd가 거부합니다. 반대 방향으로 연결된 이슈는 고를 수 있습니다. */
export function notReplacementTarget(
  issue: Pick<IssueDetail, "id" | "dependencies">,
): (candidate: Issue) => boolean {
  const unavailable = new Set([issue.id, ...issue.dependencies.map((link) => link.id)]);
  return (candidate) => unavailable.has(candidate.id);
}

/** 관계를 맺을 후보로 쓸 수 없는 이슈를 고릅니다. 자기 자신과 이미 연결된 이슈는 어느 방향이든 다시 관계를 맺을 수 없습니다. */
export function notLinkTarget(
  issue: Pick<IssueDetail, "id" | "dependencies" | "dependents">,
): (candidate: Issue) => boolean {
  const unavailable = new Set([
    issue.id,
    ...issue.dependencies.map((link) => link.id),
    ...issue.dependents.map((link) => link.id),
  ]);
  return (candidate) => unavailable.has(candidate.id);
}

/** 상세 맨 위에 막힘으로 보일, 아직 닫히지 않은 선행 이슈(blocks) 링크를 고릅니다. */
export function openBlockers(issue: Pick<IssueDetail, "dependencies">): IssueLink[] {
  return issue.dependencies.filter(
    (link) => link.dependencyType === "blocks" && link.status !== "closed",
  );
}

/**
 * 이 이슈를 막고 있는, 아직 닫히지 않은 human gate 링크를 고릅니다.
 * 상세 조회가 목록 조회보다 먼저 끝나 닫힌 상태를 받았을 수 있으므로, 목록에 있는 이슈면 목록의 상태로 판정합니다.
 *
 * @param listedIssues 상세 dialog 뒤 화면의 목록에 보이는 이슈입니다.
 */
export function openHumanGateBlockers(
  issue: Pick<IssueDetail, "dependencies">,
  listedIssues?: ReadonlyMap<string, Pick<Issue, "status">>,
): IssueLink[] {
  return issue.dependencies.filter(
    (link) =>
      link.dependencyType === "blocks" &&
      isOpenHumanGateLink({
        ...link,
        status: listedIssues?.get(link.id)?.status ?? link.status,
      }),
  );
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

/** 선행·후속 그래프가 지원하는 관계가 있으면 상세에서 그래프를 열 수 있습니다. */
export function hasGraphLink(issue: Pick<IssueDetail, "dependencies" | "dependents">): boolean {
  return [...issue.dependencies, ...issue.dependents].some((link) =>
    ["blocks", "related", "discovered-from"].includes(link.dependencyType),
  );
}

/** 상세의 연결된 이슈 한 줄입니다. side는 bd 상세의 어느 목록에서 왔는지를 뜻하며, 줄 라벨과 관계를 지우는 방향을 정합니다. */
export type LinkedIssue = { side: "dependencies" | "dependents"; link: IssueLink };

/**
 * 연결된 이슈의 줄 순서입니다. 대체한 이슈, 원본, 상위, 선행, 후속, 하위, 관련, 이 이슈를 발견한 작업, 이 작업 중 발견한 이슈, 대체된 이슈, 중복 순입니다.
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
