import { expect, test } from "vitest";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { boardItemsOf } from "./boardItems";

test("상태로 열을 정하고, 열림 이슈는 ready와 blocked 신호로 나누며, 어느 열에도 맞지 않는 이슈는 뺀다", () => {
  const issues = [
    issue("ready", { status: "open", ready: true }),
    issue("dep-blocked", { status: "open", blockedBy: ["first"] }),
    issue("doing", { status: "in_progress" }),
    issue("doing-blocked", { status: "in_progress", blockedBy: ["first"] }),
    issue("marked-blocked", { status: "blocked" }),
    issue("done", { status: "closed" }),
    issue("deferred", { status: "deferred" }),
    issue("pinned", { status: "pinned" }),
    issue("hooked", { status: "hooked" }),
    issue("custom", { status: "review" }),
    issue("open-unknown", { status: "open" }),
    issue("epic", { issueType: "epic" }),
    issue("decision", { issueType: "decision" }),
  ];

  const columns = Object.fromEntries(
    boardItemsOf(issues).map(({ column, issue }) => [issue.id, column]),
  );

  expect(columns).toEqual({
    ready: "ready",
    "dep-blocked": "blocked",
    doing: "in_progress",
    "doing-blocked": "blocked",
    "marked-blocked": "blocked",
    done: "closed",
  });
});

test("human 라벨이 붙은 열림·진행 중 이슈는 어느 열에도 넣지 않고, 닫혔거나 막힌 것은 그 열에 넣는다", () => {
  const issues = [
    issue("question", { status: "open", labels: ["human"], ready: true }),
    issue("asking", { status: "in_progress", labels: ["human"] }),
    issue("answered", { status: "closed", labels: ["human"] }),
    issue("marked-blocked", { status: "blocked", labels: ["human"] }),
    issue("dep-blocked", { status: "open", labels: ["human"], blockedBy: ["first"] }),
  ];

  const columns = Object.fromEntries(
    boardItemsOf(issues).map(({ column, issue }) => [issue.id, column]),
  );

  expect(columns).toEqual({
    answered: "closed",
    "marked-blocked": "blocked",
    "dep-blocked": "blocked",
  });
});
