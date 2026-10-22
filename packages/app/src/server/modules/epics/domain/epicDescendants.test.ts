import { expect, test } from "vitest";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { epicDescendants } from "./epicDescendants";

test("epic의 하위 이슈와 그 아래 이슈를 모두 돌려주고, 다른 epic의 이슈는 뺀다", () => {
  const issues = [
    issue("e-1", { issueType: "epic" }),
    issue("e-1.1", { issueType: "feature", parent: "e-1" }),
    issue("e-1.1.1", { status: "closed", parent: "e-1.1" }),
    issue("e-1.1.1.1", { parent: "e-1.1.1" }),
    issue("e-1.2", { parent: "e-1" }),
    issue("e-2", { issueType: "epic" }),
    issue("e-2.1", { parent: "e-2" }),
    issue("loose"),
  ];

  expect(
    epicDescendants(issues, "e-1")
      .map((issue) => issue.id)
      .sort(),
  ).toEqual(["e-1.1", "e-1.1.1", "e-1.1.1.1", "e-1.2"]);
});

test("상위 관계가 순환해도 같은 이슈를 한 번만 담는다", () => {
  const issues = [issue("a", { parent: "b" }), issue("b", { parent: "a" })];

  expect(epicDescendants(issues, "a").map((issue) => issue.id)).toEqual(["b"]);
});
