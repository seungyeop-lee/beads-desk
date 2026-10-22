import type { Issue } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import type { DecisionSummary } from "@/shared/contract/decisions";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { decisionGroups } from "./decisionsView";

function summary(
  id: string,
  fields: Partial<Issue>,
  supersededBy: string | null = null,
): DecisionSummary {
  return { decision: issue(id, fields), supersededBy };
}

test("닫히지 않은 decision은 최근에 만든 것부터, 닫힌 decision은 최근에 닫은 것부터 따로 보인다", () => {
  const { current, retired } = decisionGroups([
    summary("old", { createdAt: 1 }),
    summary("closed-early", { status: "closed", closedAt: 5 }),
    summary("new", { status: "in_progress", createdAt: 3 }),
    summary("closed-late", { status: "closed", closedAt: 9 }),
  ]);

  expect(current.map(({ decision }) => decision.id)).toEqual(["new", "old"]);
  expect(retired.map(({ decision }) => decision.id)).toEqual(["closed-late", "closed-early"]);
});

test("만든 시각이 같은 decision은 입력 순서를 바꿔 넣어도 같은 순서로 보인다", () => {
  const summaries = [summary("desk-10", { createdAt: 7 }), summary("desk-2", { createdAt: 7 })];

  const { current } = decisionGroups(summaries);
  const { current: reversed } = decisionGroups([...summaries].reverse());

  expect(current.map(({ decision }) => decision.id)).toEqual(["desk-2", "desk-10"]);
  expect(reversed.map(({ decision }) => decision.id)).toEqual(["desk-2", "desk-10"]);
});

test("각 decision이 대체한 decision을 함께 보인다", () => {
  const { current, retired } = decisionGroups([
    summary("v3", { createdAt: 3 }),
    summary("v2", { status: "closed", closedAt: 2 }, "v3"),
    summary("v1", { status: "closed", closedAt: 1 }, "v2"),
    summary("v1b", { status: "closed", closedAt: 0 }, "v3"),
  ]);

  expect(current.map(({ decision, supersedes }) => [decision.id, supersedes])).toEqual([
    ["v3", ["v2", "v1b"]],
  ]);
  expect(retired.map(({ decision, supersedes }) => [decision.id, supersedes])).toEqual([
    ["v2", ["v1"]],
    ["v1", []],
    ["v1b", []],
  ]);
});
