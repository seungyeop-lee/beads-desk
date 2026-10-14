import { expect, test } from "vitest";
import { dependencyToAdd } from "./issueRelations";

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
