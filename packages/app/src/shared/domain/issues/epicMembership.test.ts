import { expect, test } from "vitest";
import { issue } from "./issueFixture.testkit";
import { nearestEpicAncestors } from "./epicMembership";

test("일반 부모와 닫힌 gate를 건너 가장 가까운 상위 epic을 찾고 epic 자신은 넣지 않는다", () => {
  const outer = issue("outer", { issueType: "epic", status: "closed" });
  const inner = issue("inner", { issueType: "epic", parent: "outer" });
  const issues = [
    outer,
    inner,
    issue("direct", { parent: "inner" }),
    issue("parent", { parent: "inner" }),
    issue("indirect", { parent: "parent" }),
    issue("gate", { issueType: "gate", status: "closed", parent: "outer" }),
    issue("through-gate", { parent: "gate" }),
    issue("plain"),
    issue("plain-child", { parent: "plain" }),
    issue("missing", { parent: "absent" }),
  ];

  expect(nearestEpicAncestors(issues)).toEqual({
    inner: { id: "outer", title: outer.title },
    direct: { id: "inner", title: inner.title },
    parent: { id: "inner", title: inner.title },
    indirect: { id: "inner", title: inner.title },
    gate: { id: "outer", title: outer.title },
    "through-gate": { id: "outer", title: outer.title },
  });
});

test("부모 순환과 자기 참조는 멈추고 자기 자신을 소속 링크로 돌려주지 않는다", () => {
  const epic = issue("epic", { issueType: "epic", parent: "task" });
  expect(
    nearestEpicAncestors([
      epic,
      issue("task", { parent: "epic" }),
      issue("self", { issueType: "epic", parent: "self" }),
      issue("a", { parent: "b" }),
      issue("b", { parent: "a" }),
    ]),
  ).toEqual({ task: { id: "epic", title: epic.title } });
});
