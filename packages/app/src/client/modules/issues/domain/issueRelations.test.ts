import type { IssueLink } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import {
  dependencyToAdd,
  hasGraphLink,
  linkedIssues,
  notLinkTarget,
  notReplacementTarget,
  openBlockers,
  openHumanGateBlockers,
} from "./issueRelations";

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

test("연결된 이슈는 상위, 선행, 후속, 하위, 관련, 이 이슈를 발견한 작업, 이 작업 중 발견한 이슈 순이고 같은 관계 안에서는 받은 순서를 지킨다", () => {
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

function link(id: string, dependencyType: string, status = "open"): IssueLink {
  return {
    id,
    title: id,
    status,
    priority: 2,
    issueType: "task",
    dependencyType,
    awaitType: "",
  };
}

test("상세 맨 위에 보일 선행 이슈는 닫히지 않은 blocks 링크뿐이다", () => {
  const blockers = openBlockers({
    dependencies: [
      link("open-blocker", "blocks"),
      link("closed-blocker", "blocks", "closed"),
      link("open-parent", "parent-child"),
      link("open-related", "related"),
    ],
  });

  expect(blockers.map(({ id }) => id)).toEqual(["open-blocker"]);
});

test("human gate 패널은 blocks인 열린 human gate 링크만 고르고, 목록에 있는 이슈는 목록의 상태로 판정한다", () => {
  const gate = (id: string, status: string): IssueLink => ({
    id,
    title: id,
    status,
    priority: 2,
    issueType: "gate",
    dependencyType: "blocks",
    awaitType: "human",
  });
  const issue = {
    dependencies: [
      gate("open-gate", "open"),
      gate("closed-gate", "closed"),
      gate("stale-gate", "open"),
      { ...gate("timer-gate", "open"), awaitType: "timer" },
      link("task-blocker", "blocks"),
      { ...gate("gate-parent", "open"), dependencyType: "parent-child" },
    ],
  };
  const listedIssues = new Map([
    ["stale-gate", { status: "closed" }],
    ["closed-gate", { status: "open" }],
  ]);

  expect(openHumanGateBlockers(issue).map(({ id }) => id)).toEqual(["open-gate", "stale-gate"]);
  expect(openHumanGateBlockers(issue, listedIssues).map(({ id }) => id)).toEqual([
    "open-gate",
    "closed-gate",
  ]);
});

test("관계 추가 후보에서 자기 자신과 이미 양방향으로 연결된 이슈를 뺀다", () => {
  const excluded = notLinkTarget({
    id: "self",
    dependencies: [link("blocker", "blocks")],
    dependents: [link("dependent", "blocks")],
  });
  const candidate = (id: string) => issue(id);

  expect(excluded(candidate("self"))).toBe(true);
  expect(excluded(candidate("blocker"))).toBe(true);
  expect(excluded(candidate("dependent"))).toBe(true);
  expect(excluded(candidate("other"))).toBe(false);
});

test("대체·중복 닫기 후보에서 자기 자신과 이미 의존하는 이슈는 빼고, 이 이슈에 의존하는 이슈는 남긴다", () => {
  const excluded = notReplacementTarget({ id: "self", dependencies: [link("blocker", "blocks")] });
  const candidate = (id: string) => issue(id);

  expect(excluded(candidate("self"))).toBe(true);
  expect(excluded(candidate("blocker"))).toBe(true);
  expect(excluded(candidate("dependent"))).toBe(false);
});

test("선행·후속 그래프는 양방향 blocks·related·discovered-from 관계에서 열 수 있다", () => {
  expect(hasGraphLink({ dependencies: [link("blocker", "blocks")], dependents: [] })).toBe(true);
  expect(hasGraphLink({ dependencies: [], dependents: [link("waiter", "blocks")] })).toBe(true);
  expect(
    hasGraphLink({
      dependencies: [link("epic", "parent-child")],
      dependents: [],
    }),
  ).toBe(false);
});

for (const type of ["related", "discovered-from"]) {
  test(`${type}만 있어도 양쪽 상세에서 그래프를 열 수 있다`, () => {
    expect(hasGraphLink({ dependencies: [link("other", type)], dependents: [] })).toBe(true);
    expect(hasGraphLink({ dependencies: [], dependents: [link("other", type)] })).toBe(true);
  });
}
