import type { Issue } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { blocks } from "./blocksFixture.testkit";
import { blockingChainIssues, scopedIssues } from "./graphScope";

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
    dependencies: blocks(
      { blocker: "a", blocked: "b" },
      { blocker: "b", blocked: "center" },
      { blocker: "center", blocked: "d" },
      { blocker: "d", blocked: "e" },
      { blocker: "b", blocked: "side" },
    ),
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
        { blocker: "closed-before", blocked: "center" },
        { blocker: "before-closed", blocked: "closed-before" },
        { blocker: "center", blocked: "closed-after" },
        { blocker: "closed-after", blocked: "after-closed" },
        { blocker: "closed-before", blocked: "closed-side" },
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
    dependencies: blocks(
      { blocker: "before", blocked: "center" },
      { blocker: "center", blocked: "next" },
    ),
    ancestorEpics: {},
  };

  expect(ids(scopedIssues(data, { kind: "center", id: "center" }))).toEqual([
    "before",
    "center",
    "next",
  ]);
});

test("gate를 기준으로 열면 gate의 선행 이슈와 gate를 기다리는 이슈의 사슬을 담고, 같은 작업을 막는 다른 gate와 작업의 관련 이슈는 뺀다", () => {
  const data = {
    issues: [
      issue("before"),
      issue("work"),
      issue("after"),
      issue("note"),
      ...["shared", "other", "other-before"].map((id) => issue(id, { issueType: "gate" })),
    ],
    dependencies: [
      ...blocks(
        { blocker: "before", blocked: "work" },
        { blocker: "work", blocked: "after" },
        { blocker: "shared", blocked: "work" },
        { blocker: "shared", blocked: "after" },
        { blocker: "before", blocked: "shared" },
        { blocker: "other", blocked: "work" },
        { blocker: "other-before", blocked: "other" },
      ),
      { issueId: "work", dependsOnId: "note", type: "related", createdAt: 0 },
    ],
    ancestorEpics: {},
  };

  expect(ids(scopedIssues(data, { kind: "center", id: "shared" }))).toEqual([
    "before",
    "work",
    "after",
    "shared",
  ]);
});

test("blocks가 순환해도 끝난다", () => {
  const data = {
    issues: [issue("a"), issue("b")],
    dependencies: blocks({ blocker: "b", blocked: "a" }, { blocker: "a", blocked: "b" }),
    ancestorEpics: {},
  };

  expect(ids(scopedIssues(data, { kind: "center", id: "a" }))).toEqual(["a", "b"]);
});

test("이미 계산한 blocks 사슬을 넘기면 사슬을 다시 구하지 않고 같은 이슈를 돌려준다", () => {
  const data = {
    issues: ["a", "b", "center", "d", "related"].map((id) => issue(id)),
    dependencies: [
      ...blocks(
        { blocker: "a", blocked: "b" },
        { blocker: "b", blocked: "center" },
        { blocker: "center", blocked: "d" },
      ),
      { issueId: "related", dependsOnId: "center", type: "related", createdAt: 0 },
    ],
    ancestorEpics: {},
  };
  const chain = blockingChainIssues(data.issues, data.dependencies, "center");

  expect(ids(scopedIssues(data, { kind: "center", id: "center" }, chain))).toEqual(
    ids(scopedIssues(data, { kind: "center", id: "center" })),
  );
});
