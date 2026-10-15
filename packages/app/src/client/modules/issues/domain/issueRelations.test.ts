import type { IssueLink } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import { dependencyToAdd, linkedIssues } from "./issueRelations";

test("고른 관계를 bd dep add의 방향과 유형으로 바꾼다", () => {
  expect(dependencyToAdd("blockedBy", "self", "other")).toEqual({
    issueId: "self",
    dependsOnId: "other",
    type: "blocks",
  });
  expect(dependencyToAdd("blocks", "self", "other")).toEqual({
    issueId: "other",
    dependsOnId: "self",
    type: "blocks",
  });
  expect(dependencyToAdd("parent", "self", "other")).toEqual({
    issueId: "self",
    dependsOnId: "other",
    type: "parent-child",
  });
  expect(dependencyToAdd("child", "self", "other")).toEqual({
    issueId: "other",
    dependsOnId: "self",
    type: "parent-child",
  });
  expect(dependencyToAdd("related", "self", "other")).toEqual({
    issueId: "self",
    dependsOnId: "other",
    type: "related",
  });
});

test("연결된 이슈는 상위, 선행, 후속, 하위, 관련, 발견 출처, 여기서 발견 순이고 같은 관계 안에서는 받은 순서를 지킨다", () => {
  const rows = linkedIssues({
    dependencies: [
      link("related-out", "related"),
      link("found-from", "discovered-from"),
      link("blocker-1", "blocks"),
      link("parent", "parent-child"),
      link("blocker-2", "blocks"),
    ],
    dependents: [
      link("found-here", "discovered-from"),
      link("child", "parent-child"),
      link("related-in", "related"),
      link("blocked", "blocks"),
    ],
  });

  expect(rows.map(({ side, link }) => [side, link.id])).toEqual([
    ["dependencies", "parent"],
    ["dependencies", "blocker-1"],
    ["dependencies", "blocker-2"],
    ["dependents", "blocked"],
    ["dependents", "child"],
    ["dependencies", "related-out"],
    ["dependents", "related-in"],
    ["dependencies", "found-from"],
    ["dependents", "found-here"],
  ]);
});

test("대체하거나 원본인 이슈는 이 이슈가 왜 닫혔는지 알리므로 맨 앞에, 이 이슈를 대체했거나 중복인 이슈는 발견 관계 뒤에 둔다", () => {
  const rows = linkedIssues({
    dependencies: [
      link("parent", "parent-child"),
      link("canonical", "duplicates"),
      link("replacement", "supersedes"),
    ],
    dependents: [
      link("duplicate", "duplicates"),
      link("found-here", "discovered-from"),
      link("superseded", "supersedes"),
    ],
  });

  expect(rows.map(({ side, link }) => [side, link.id])).toEqual([
    ["dependencies", "replacement"],
    ["dependencies", "canonical"],
    ["dependencies", "parent"],
    ["dependents", "found-here"],
    ["dependents", "superseded"],
    ["dependents", "duplicate"],
  ]);
});

test("모르는 의존 유형은 연결된 이슈의 맨 뒤에 둔다", () => {
  const rows = linkedIssues({
    dependencies: [link("unknown", "waits-for"), link("parent", "parent-child")],
    dependents: [],
  });

  expect(rows.map(({ link }) => link.id)).toEqual(["parent", "unknown"]);
});

function link(id: string, dependencyType: string): IssueLink {
  return { id, title: id, status: "open", priority: 2, issueType: "task", dependencyType };
}
