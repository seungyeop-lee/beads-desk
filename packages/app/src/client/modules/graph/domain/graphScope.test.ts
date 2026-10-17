import type { Issue, IssueDependency } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import { scopedIssues } from "./graphScope";

function issue(id: string, fields: Partial<Issue> = {}): Issue {
  return { id, status: "open", issueType: "task", ...fields } as Issue;
}

/** [기다리는 이슈, 먼저 끝나야 하는 이슈]를 bd의 blocks 의존으로 바꿉니다. */
function blocks(...pairs: [string, string][]): IssueDependency[] {
  return pairs.map(([issueId, dependsOnId]) => ({
    issueId,
    dependsOnId,
    type: "blocks",
    createdAt: 0,
  }));
}

const ids = (issues: Issue[]) => issues.map((it) => it.id);

test("에픽 보기는 그 에픽의 후손 이슈를 닫힌 이슈까지 담고, 에픽 자신과 다른 에픽의 이슈는 뺀다", () => {
  const data = {
    issues: [
      issue("epic", { issueType: "epic" }),
      issue("feature", { issueType: "feature" }),
      issue("task"),
      issue("done", { status: "closed" }),
      issue("other"),
    ],
    dependencies: [],
    ancestorEpics: {
      feature: ["epic"],
      task: ["epic"],
      done: ["epic"],
      other: ["other-epic"],
    },
  };

  expect(ids(scopedIssues(data, { kind: "epic", id: "epic" }))).toEqual([
    "feature",
    "task",
    "done",
  ]);
});

test("이슈 중심 보기는 중심 이슈에서 blocks를 따라 앞뒤로 끝까지 이어진 이슈를 담고, 사슬 옆으로 갈라진 이슈는 뺀다", () => {
  const data = {
    issues: ["a", "b", "center", "d", "e", "side", "alone"].map((id) => issue(id)),
    dependencies: blocks(["b", "a"], ["center", "b"], ["d", "center"], ["e", "d"], ["side", "b"]),
    ancestorEpics: {},
  };

  expect(ids(scopedIssues(data, { kind: "center", id: "center" }))).toEqual([
    "a",
    "b",
    "center",
    "d",
    "e",
  ]);
});

test("이슈 중심 보기는 닫힌 선행·후속 이슈 너머까지 담고, 옆 갈래는 빼고 기준의 관련 이슈는 담는다", () => {
  const data = {
    issues: [
      issue("before-closed"),
      issue("closed-before", { status: "closed" }),
      issue("center"),
      issue("closed-after", { status: "closed" }),
      issue("after-closed"),
      issue("closed-side", { status: "closed" }),
      issue("related"),
    ],
    dependencies: [
      ...blocks(
        ["center", "closed-before"],
        ["closed-before", "before-closed"],
        ["closed-after", "center"],
        ["after-closed", "closed-after"],
        ["closed-side", "closed-before"],
      ),
      { issueId: "related", dependsOnId: "center", type: "related", createdAt: 0 },
    ],
    ancestorEpics: {},
  };

  expect(ids(scopedIssues(data, { kind: "center", id: "center" }))).toEqual([
    "before-closed",
    "closed-before",
    "center",
    "closed-after",
    "after-closed",
    "related",
  ]);
});

test("중심 이슈와 앞뒤 이슈가 모두 닫혔어도 사슬 전체를 담는다", () => {
  const data = {
    issues: ["before", "center", "next"].map((id) => issue(id, { status: "closed" })),
    dependencies: blocks(["center", "before"], ["next", "center"]),
    ancestorEpics: {},
  };

  expect(ids(scopedIssues(data, { kind: "center", id: "center" }))).toEqual([
    "before",
    "center",
    "next",
  ]);
});

test("blocks가 순환해도 끝난다", () => {
  const data = {
    issues: [issue("a"), issue("b")],
    dependencies: blocks(["a", "b"], ["b", "a"]),
    ancestorEpics: {},
  };

  expect(ids(scopedIssues(data, { kind: "center", id: "a" }))).toEqual(["a", "b"]);
});
