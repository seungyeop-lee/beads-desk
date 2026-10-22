import type { Issue } from "@beads-desk/bd/issue";
import { describe, expect, test } from "vitest";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { byPriorityThenCreated } from "./issueSort";

const ids = (issues: Issue[]) => issues.map((it) => it.id);

describe("byPriorityThenCreated", () => {
  test("우선순위와 만든 시각이 같으면 id의 숫자 부분을 숫자로 비교한다", () => {
    const issues = [issue("demo-x.10"), issue("demo-x.2"), issue("demo-x.1")];

    expect(ids(issues.sort(byPriorityThenCreated))).toEqual(["demo-x.1", "demo-x.2", "demo-x.10"]);
  });
});
