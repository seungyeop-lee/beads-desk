import type { Issue } from "@beads-desk/bd/issue";
import { describe, expect, test } from "vitest";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { byPriorityThenCreated, byStatusGroup } from "./issueSort";

const ids = (issues: Issue[]) => issues.map((it) => it.id);

describe("byStatusGroup", () => {
  test("상태 순서대로 묶고, 묶음 안에서는 우선순위와 생성 시각 순, 닫힘은 최근에 닫은 순으로 정렬한다", () => {
    const issues = [
      issue("closed-old", { status: "closed", closedAt: 1 }),
      issue("blocked", { status: "blocked" }),
      issue("open-p2-late", { createdAt: 20 }),
      issue("progress", { status: "in_progress" }),
      issue("open-p2-early", { createdAt: 10 }),
      issue("closed-new", { status: "closed", closedAt: 2 }),
      issue("open-p0", { priority: 0, createdAt: 30 }),
      issue("deferred", { status: "deferred" }),
    ];

    expect(ids(issues.sort(byStatusGroup))).toEqual([
      "open-p0",
      "open-p2-early",
      "open-p2-late",
      "progress",
      "blocked",
      "deferred",
      "closed-new",
      "closed-old",
    ]);
  });
});

describe("byPriorityThenCreated", () => {
  test("우선순위와 만든 시각이 같으면 id의 숫자 부분을 숫자로 비교한다", () => {
    const issues = [issue("demo-x.10"), issue("demo-x.2"), issue("demo-x.1")];

    expect(ids(issues.sort(byPriorityThenCreated))).toEqual(["demo-x.1", "demo-x.2", "demo-x.10"]);
  });
});
