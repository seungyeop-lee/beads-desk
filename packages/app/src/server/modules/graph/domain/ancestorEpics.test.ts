import { expect, test } from "vitest";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { ancestorEpicsOf } from "./ancestorEpics";

test("닫힌 상위 이슈를 거쳐 닿는 에픽까지 가까운 것부터 소속으로 담는다", () => {
  const issues = [
    issue("outer", { issueType: "epic" }),
    issue("inner", { issueType: "epic", parent: "outer" }),
    issue("feature", { issueType: "feature", status: "closed", parent: "inner" }),
    issue("task", { parent: "feature" }),
    issue("alone"),
  ];

  expect(ancestorEpicsOf(issues)).toEqual({
    inner: ["outer"],
    feature: ["inner", "outer"],
    task: ["inner", "outer"],
  });
});

test("상위 관계가 순환해도 소속을 정하다 멈춘다", () => {
  const issues = [
    issue("x", { issueType: "epic", parent: "y" }),
    issue("y", { issueType: "epic", parent: "x" }),
  ];

  expect(ancestorEpicsOf(issues)).toEqual({ x: ["y"], y: ["x"] });
});
