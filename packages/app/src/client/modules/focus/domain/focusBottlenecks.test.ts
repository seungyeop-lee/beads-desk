import type { Issue } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { focusBottlenecks, type Bottleneck } from "./focusBottlenecks";
import { focusDeadlines } from "./focusDeadlines";

// 2026-10-30(금) 14:00, browser 현지 시각입니다.
const NOW = new Date(2026, 9, 30, 14, 0).getTime();

const at = (month: number, date: number, hours = 0, minutes = 0) =>
  new Date(2026, month - 1, date, hours, minutes).getTime();

function bottlenecksAt(issues: Issue[], now = NOW): Bottleneck[] {
  return focusBottlenecks(issues, focusDeadlines(issues, now), now);
}

/** 후보 id마다 후속 이슈 수와 바로 풀리는 이슈 수입니다. */
function counts(bottlenecks: Bottleneck[]) {
  return Object.fromEntries(
    bottlenecks.map(({ issue, waiters, unblocks }) => [issue.id, { waiters, unblocks }]),
  );
}

const evidence = (bottleneck: Bottleneck | undefined) =>
  bottleneck?.deadlines.map(({ issue, kind }) => [issue.id, kind]);

test("직렬, 분기, 다시 합쳐지는 그래프에서 후속 이슈를 경로마다 따로 세지 않고, 선행 조건이 여럿인 이슈는 바로 풀린다고 세지 않는다", () => {
  const bottlenecks = bottlenecksAt([
    // 직렬: serial-1 → serial-2 → serial-3
    issue("serial-1", { ready: true }),
    issue("serial-2", { blockedBy: ["serial-1"] }),
    issue("serial-3", { blockedBy: ["serial-2"] }),
    // 분기: branch → branch-a, branch-b
    issue("branch", { ready: true }),
    issue("branch-a", { blockedBy: ["branch"] }),
    issue("branch-b", { blockedBy: ["branch"] }),
    // 다시 합쳐짐: diamond → left, right → join
    issue("diamond", { ready: true }),
    issue("left", { blockedBy: ["diamond"] }),
    issue("right", { blockedBy: ["diamond"] }),
    issue("join", { blockedBy: ["left", "right"] }),
  ]);

  expect(counts(bottlenecks)).toEqual({
    "serial-1": { waiters: 2, unblocks: 1 },
    // 자신도 막혀 있지만 후보로 남기고, 화면이 지금 상태를 따로 보입니다.
    "serial-2": { waiters: 1, unblocks: 1 },
    branch: { waiters: 2, unblocks: 2 },
    diamond: { waiters: 3, unblocks: 2 },
    left: { waiters: 1, unblocks: 0 },
    right: { waiters: 1, unblocks: 0 },
  });
});

test("human gate가 함께 막거나, 닫혔거나, 풀려도 손댈 수 없는 후속 이슈는 바로 풀린다고 세지 않고, 닫힌 이슈와 직접 작업하지 않는 유형은 후보가 아니다", () => {
  const bottlenecks = bottlenecksAt([
    issue("with-gate", { ready: true }),
    issue("gated", { blockedBy: ["with-gate", "desk-gate"] }),
    issue("prior", { ready: true }),
    issue("closed-after", { status: "closed", blockedBy: ["prior"] }),
    issue("deferred-after", { status: "deferred", blockedBy: ["prior"] }),
    issue("human-after", { labels: ["human"], blockedBy: ["prior"] }),
    issue("doing-after", { status: "in_progress", blockedBy: ["prior"] }),
    issue("epic", { issueType: "epic" }),
    issue("epic-child", { parent: "epic", blockedBy: ["epic"] }),
    issue("closed-blocker", { status: "closed" }),
    issue("stale", { blockedBy: ["closed-blocker"] }),
  ]);

  expect(counts(bottlenecks)).toEqual({
    "with-gate": { waiters: 1, unblocks: 0 },
    prior: { waiters: 3, unblocks: 1 },
  });
});

test("열려 있어도 보류 기한이 오지 않은 후속 이슈는 bd ready처럼 바로 풀린다고 세지 않고, 보류 기한이 지났으면 센다", () => {
  const bottlenecks = bottlenecksAt([
    issue("prior", { ready: true }),
    issue("deferred-later", { blockedBy: ["prior"], deferUntil: NOW + 1 }),
    issue("deferred-past", { blockedBy: ["prior"], deferUntil: NOW - 1 }),
  ]);

  expect(counts(bottlenecks)).toEqual({ prior: { waiters: 2, unblocks: 1 } });
});

test("기한 초과, 오늘 마감, 3일 이내인 후속 이슈만 마감 근거로 붙이고, 마감 목록과 같은 분류와 마감 시각 순서로 둔다", () => {
  const issues = [
    issue("blocks-many", { ready: true }),
    issue("tonight", { blockedBy: ["blocks-many"], dueAt: at(10, 30, 23, 30) }),
    issue("overdue", { blockedBy: ["tonight"], dueAt: at(10, 29) }),
    issue("soon", { blockedBy: ["blocks-many"], dueAt: at(11, 2, 9, 0) }),
    issue("later", { blockedBy: ["blocks-many"], dueAt: at(11, 3) }),
    issue("blocks-undated", { ready: true }),
    issue("undated", { blockedBy: ["blocks-undated"] }),
  ];
  const deadlines = focusDeadlines(issues, NOW);
  const bottlenecks = focusBottlenecks(issues, deadlines, NOW);
  const of = (id: string) => bottlenecks.find((bottleneck) => bottleneck.issue.id === id);

  expect(evidence(of("blocks-many"))).toEqual([
    ["overdue", "overdue"],
    ["tonight", "dueToday"],
    ["soon", "dueSoon"],
  ]);
  expect(of("blocks-many")?.deadlines.map(({ issue }) => issue)).toEqual([
    ...deadlines.overdue,
    ...deadlines.dueToday,
    ...deadlines.dueSoon,
  ]);
  expect(evidence(of("blocks-undated"))).toEqual([]);
});

test("후속 이슈 수가 같으면 후속 이슈의 마감 시각이 이른 후보를 앞에 두고, 같은 날 마감도 시각으로 가르며, 마감 근거가 없는 후보는 바로 풀리는 이슈가 많아도 뒤에 둔다", () => {
  const issues = [
    issue("undated-blocker", { ready: true, priority: 0 }),
    issue("undated", { blockedBy: ["undated-blocker"] }),
    issue("evening-blocker", { ready: true }),
    // 다른 선행 조건도 기다려 바로 풀리지 않지만, 마감 근거가 있어 마감 근거가 없는 후보보다 앞에 옵니다.
    issue("evening", {
      blockedBy: ["evening-blocker", "desk-gate"],
      dueAt: at(10, 30, 21, 0),
    }),
    issue("afternoon-blocker", { ready: true }),
    issue("afternoon", { blockedBy: ["afternoon-blocker"], dueAt: at(10, 30, 16, 0) }),
    issue("overdue-blocker", { ready: true }),
    issue("overdue", { blockedBy: ["overdue-blocker"], dueAt: at(10, 28) }),
    issue("many-blocker", { ready: true }),
    issue("many-1", { blockedBy: ["many-blocker"] }),
    issue("many-2", { blockedBy: ["many-blocker"] }),
  ];

  expect(bottlenecksAt(issues).map(({ issue }) => issue.id)).toEqual([
    "many-blocker",
    "overdue-blocker",
    "afternoon-blocker",
    "evening-blocker",
    "undated-blocker",
  ]);
});

test("마감 근거가 같으면 바로 풀리는 이슈가 많은 후보를, 그것도 같으면 우선순위가 높은 후보를 앞에 둔다", () => {
  const issues = [
    issue("low", { ready: true, priority: 3 }),
    issue("low-after", { blockedBy: ["low"] }),
    issue("high", { ready: true, priority: 1 }),
    issue("high-after", { blockedBy: ["high"] }),
    issue("sole", { ready: true, priority: 4 }),
    issue("sole-after", { blockedBy: ["sole"] }),
    issue("shared", { ready: true, priority: 0 }),
    issue("shared-after", { blockedBy: ["shared", "desk-gate"] }),
  ];

  expect(bottlenecksAt(issues).map(({ issue }) => issue.id)).toEqual([
    "high",
    "low",
    "sole",
    "shared",
  ]);
});

test("이슈가 그대로여도 마감 시각을 넘거나 자정을 지나 마감 목록이 다시 나뉘면 마감 근거와 순서가 따라 바뀐다", () => {
  const issues = [
    issue("today-blocker", { ready: true }),
    issue("today", { blockedBy: ["today-blocker"], dueAt: at(10, 30, 18, 0) }),
    issue("fourth-day-blocker", { ready: true }),
    issue("fourth-day", { blockedBy: ["fourth-day-blocker"], dueAt: at(11, 3, 9, 0) }),
    // 우선순위가 높아, 마감 근거가 없는 후보끼리는 앞에 옵니다.
    issue("undated-blocker", { ready: true, priority: 0 }),
    issue("undated", { blockedBy: ["undated-blocker"] }),
  ];
  const before = bottlenecksAt(issues);
  expect(before.map(({ issue }) => issue.id)).toEqual([
    "today-blocker",
    "undated-blocker",
    "fourth-day-blocker",
  ]);
  expect(evidence(before[0])).toEqual([["today", "dueToday"]]);
  expect(evidence(before[2])).toEqual([]);

  const afterDue = bottlenecksAt(issues, focusDeadlines(issues, NOW).nextChange);
  expect(evidence(afterDue[0])).toEqual([["today", "overdue"]]);

  const nextDay = bottlenecksAt(issues, at(10, 31));
  expect(nextDay.map(({ issue }) => issue.id)).toEqual([
    "today-blocker",
    "fourth-day-blocker",
    "undated-blocker",
  ]);
  expect(evidence(nextDay[1])).toEqual([["fourth-day", "dueSoon"]]);
});
