import { expect, test } from "vitest";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { waiterCounts } from "@/shared/domain/issues/waiterCounts";
import { groupByWorkState, issueListGroups, workState } from "./workState";

const NO_WAITERS: ReadonlyMap<string, number> = new Map();

test("열린 이슈는 bd ready에 있으면 ready이고, 없으면 other이다", () => {
  expect(workState(issue("demo-1", { ready: true }))).toBe("ready");
  expect(workState(issue("demo-1"))).toBe("other");
});

test("의존 관계 때문에 막힌 이슈는 저장 상태가 열림이나 진행 중이어도 blocked이다", () => {
  expect(workState(issue("demo-1", { blockedBy: ["demo-2"] }))).toBe("blocked");
  expect(workState(issue("demo-1", { status: "in_progress", blockedBy: ["demo-2"] }))).toBe(
    "blocked",
  );
  expect(workState(issue("demo-1", { status: "blocked" }))).toBe("blocked");
});

test("닫힌 이슈는 막고 있는 이슈가 남아 있어도 closed이다", () => {
  expect(workState(issue("demo-1", { status: "closed", blockedBy: ["demo-2"] }))).toBe("closed");
});

test("보류 이슈는 막고 있는 이슈가 남아 있어도 deferred이다", () => {
  expect(workState(issue("demo-1", { status: "deferred", blockedBy: ["demo-2"] }))).toBe(
    "deferred",
  );
});

test("epic, molecule, decision, milestone은 진행 중이거나 bd ready에 있어도 other이다", () => {
  expect(workState(issue("demo-1", { issueType: "epic", status: "in_progress" }))).toBe("other");
  expect(workState(issue("demo-1", { issueType: "molecule", status: "in_progress" }))).toBe(
    "other",
  );
  expect(workState(issue("demo-1", { issueType: "decision", ready: true }))).toBe("other");
  expect(workState(issue("demo-1", { issueType: "milestone", ready: true }))).toBe("other");
  expect(workState(issue("demo-1", { issueType: "epic", status: "closed" }))).toBe("closed");
});

test("진행 중과 보류는 저장 상태를 따르고, 알 수 없는 상태는 other이다", () => {
  expect(workState(issue("demo-1", { status: "in_progress" }))).toBe("in_progress");
  expect(workState(issue("demo-1", { status: "deferred" }))).toBe("deferred");
  expect(workState(issue("demo-1", { status: "pinned" }))).toBe("other");
});

test("human 라벨이 붙은 열린 이슈는 bd ready에 있거나 진행 중이어도 awaiting_human이고, 닫힘, 보류, 막힘이 먼저다", () => {
  const human = { labels: ["human"] };
  expect(workState(issue("demo-1", { ...human, ready: true }))).toBe("awaiting_human");
  expect(workState(issue("demo-1", { ...human, status: "in_progress" }))).toBe("awaiting_human");
  expect(workState(issue("demo-1", { ...human, issueType: "epic" }))).toBe("awaiting_human");
  expect(workState(issue("demo-1", { ...human, status: "closed" }))).toBe("closed");
  expect(workState(issue("demo-1", { ...human, blockedBy: ["demo-2"] }))).toBe("blocked");
  expect(workState(issue("demo-1", { ...human, status: "deferred" }))).toBe("deferred");
});

test("작업 상태로 묶어 진행 중, 바로 작업 가능, 막힘, 판단 기다림, 그 밖, 보류, 닫힘 순으로 돌려주고 빈 묶음은 뺀다", () => {
  const groups = groupByWorkState(
    [
      issue("demo-1", { id: "closed", status: "closed" }),
      issue("demo-1", { id: "ready", ready: true }),
      issue("demo-1", { id: "doing", status: "in_progress" }),
      issue("demo-1", { id: "epic", issueType: "epic" }),
      issue("demo-1", { id: "waiting", blockedBy: ["ready"] }),
      issue("demo-1", { id: "question", labels: ["human"], ready: true }),
    ],
    NO_WAITERS,
  );

  expect(groups.map(({ state, issues }) => [state, issues.map(({ id }) => id)])).toEqual([
    ["in_progress", ["doing"]],
    ["ready", ["ready"]],
    ["blocked", ["waiting"]],
    ["awaiting_human", ["question"]],
    ["other", ["epic"]],
    ["closed", ["closed"]],
  ]);
});

test("묶음 안에서 닫힘은 최근에 닫은 순, 나머지는 우선순위와 만든 시각 순이다", () => {
  const groups = groupByWorkState(
    [
      issue("demo-1", { id: "p2-late", ready: true, createdAt: 20 }),
      issue("demo-1", { id: "p0", ready: true, priority: 0, createdAt: 30 }),
      issue("demo-1", { id: "p2-early", ready: true, createdAt: 10 }),
      issue("demo-1", { id: "closed-old", status: "closed", closedAt: 1 }),
      issue("demo-1", { id: "closed-new", status: "closed", closedAt: 2 }),
    ],
    NO_WAITERS,
  );

  expect(groups.map(({ issues }) => issues.map(({ id }) => id))).toEqual([
    ["p0", "p2-early", "p2-late"],
    ["closed-new", "closed-old"],
  ]);
});

test("바로 작업 가능은 우선순위가 먼저이고, 같은 우선순위 안에서는 대기 수가 많은 순, 그다음 만든 시각 순이다", () => {
  const issues = [
    issue("demo-1", { id: "p1-old", ready: true, priority: 1, createdAt: 1 }),
    issue("demo-1", { id: "p2-old", ready: true, createdAt: 2 }),
    issue("demo-1", { id: "p2-one", ready: true, createdAt: 3 }),
    issue("demo-1", { id: "p2-two", ready: true, createdAt: 4 }),
    issue("demo-1", { id: "p2-two-new", ready: true, createdAt: 5 }),
    issue("demo-1", { id: "p3-many", ready: true, priority: 3, createdAt: 6 }),
    issue("demo-1", { id: "w1", blockedBy: ["p2-one"] }),
    issue("demo-1", { id: "w2", blockedBy: ["p2-two"] }),
    issue("demo-1", { id: "w3", blockedBy: ["w2"] }),
    issue("demo-1", { id: "w4", blockedBy: ["p2-two-new"] }),
    issue("demo-1", { id: "w5", blockedBy: ["p2-two-new"] }),
    issue("demo-1", { id: "w6", blockedBy: ["p3-many"] }),
    issue("demo-1", { id: "w7", blockedBy: ["p3-many"] }),
    issue("demo-1", { id: "w8", blockedBy: ["p3-many"] }),
  ];

  const ready = groupByWorkState(issues, waiterCounts(issues)).find(
    ({ state }) => state === "ready",
  );

  expect(ready?.issues.map(({ id }) => id)).toEqual([
    "p1-old",
    "p2-two",
    "p2-two-new",
    "p2-one",
    "p2-old",
    "p3-many",
  ]);
});

test("바로 작업 가능이 아닌 묶음은 대기 수와 관계없이 우선순위와 만든 시각 순이다", () => {
  const issues = [
    issue("demo-1", { id: "doing-old", status: "in_progress", createdAt: 1 }),
    issue("demo-1", { id: "doing-new", status: "in_progress", createdAt: 2 }),
    issue("demo-1", { id: "waiter", blockedBy: ["doing-new"] }),
  ];

  const inProgress = groupByWorkState(issues, waiterCounts(issues)).find(
    ({ state }) => state === "in_progress",
  );

  expect(inProgress?.issues.map(({ id }) => id)).toEqual(["doing-old", "doing-new"]);
});

test("이슈 목록의 묶음 안에서는 우선순위보다 상위 관계가 앞서, 하위 이슈가 상위 이슈 바로 아래에 온다", () => {
  const groups = issueListGroups(
    [
      issue("demo-1", { id: "parent", ready: true, priority: 2 }),
      issue("demo-1", { id: "other", ready: true, priority: 1 }),
      issue("demo-1", { id: "task", ready: true, priority: 0, parent: "parent" }),
    ],
    NO_WAITERS,
  );

  expect(groups.map(({ state, issues }) => [state, issues.map(({ id }) => id)])).toEqual([
    ["ready", ["other", "parent", "task"]],
  ]);
});

test("이슈 목록에서 상위와 작업 상태가 다른 하위 이슈는 자기 묶음에 남는다", () => {
  const groups = issueListGroups(
    [
      issue("demo-1", { id: "parent", ready: true }),
      issue("demo-1", { id: "doing", status: "in_progress", parent: "parent" }),
    ],
    NO_WAITERS,
  );

  expect(groups.map(({ state, issues }) => [state, issues.map(({ id }) => id)])).toEqual([
    ["in_progress", ["doing"]],
    ["ready", ["parent"]],
  ]);
});

// ihr-0iy로 검색한 결과입니다. 상위 epic ihr-rl7은 본문에서만 맞지만 가장 늦게 닫혀 닫힘 묶음의 맨 앞에 옵니다.
const closedSearchResult = [
  issue("ihr-rl7", { issueType: "epic", status: "closed", closedAt: 4 }),
  issue("ihr-0iy", { status: "closed", closedAt: 3, parent: "ihr-rl7" }),
  issue("ihr-t2dd", { status: "closed", closedAt: 2 }),
  issue("ihr-34b", { status: "closed", closedAt: 1 }),
];

test("검색어가 있으면 본문에서만 맞은 상위 epic보다 ID가 맞은 하위 이슈가 묶음 안에서 앞에 온다", () => {
  const groups = issueListGroups(closedSearchResult, NO_WAITERS, "IHR-0iy ");

  expect(groups.map(({ state, issues }) => [state, issues.map(({ id }) => id)])).toEqual([
    ["closed", ["ihr-0iy", "ihr-rl7", "ihr-t2dd", "ihr-34b"]],
  ]);
});

test("검색어가 있으면 제목이 맞은 이슈가 우선순위와 관계없이 같은 묶음의 본문에서만 맞은 이슈보다 앞에 온다", () => {
  const groups = issueListGroups(
    [
      issue("demo-1", { ready: true, priority: 0 }),
      issue("demo-2", { ready: true, priority: 3, title: "Login 오류" }),
      issue("demo-3", { status: "in_progress", priority: 0 }),
      issue("demo-4", { status: "in_progress", priority: 4, title: "login 화면" }),
    ],
    NO_WAITERS,
    "login",
  );

  expect(groups.map(({ state, issues }) => [state, issues.map(({ id }) => id)])).toEqual([
    ["in_progress", ["demo-4", "demo-3"]],
    ["ready", ["demo-2", "demo-1"]],
  ]);
});

test("검색어가 있어도 같은 순위 안에서는 기존 정렬 규칙과 상하위 배치를 따른다", () => {
  const groups = issueListGroups(
    [
      issue("hit-parent", { ready: true, priority: 2 }),
      issue("hit-other", { ready: true, priority: 1 }),
      issue("hit-child", { ready: true, priority: 0, parent: "hit-parent" }),
      issue("body-parent", { ready: true, priority: 3 }),
      issue("body-other", { ready: true, priority: 2 }),
      issue("body-child", { ready: true, priority: 0, parent: "body-parent" }),
    ],
    NO_WAITERS,
    "hit",
  );

  expect(groups.map(({ state, issues }) => [state, issues.map(({ id }) => id)])).toEqual([
    ["ready", ["hit-other", "hit-parent", "hit-child", "body-other", "body-parent", "body-child"]],
  ]);
});

test("검색어가 비어 있으면 묶음 안 순서는 검색어를 넘기지 않았을 때와 같다", () => {
  const ids = (search?: string) =>
    issueListGroups(closedSearchResult, NO_WAITERS, search).map(({ issues }) =>
      issues.map(({ id }) => id),
    );

  expect(ids("  ")).toEqual([["ihr-rl7", "ihr-0iy", "ihr-t2dd", "ihr-34b"]]);
  expect(ids("  ")).toEqual(ids());
});

test("검색어로 순서를 바꿔도 묶음마다 든 이슈와 개수는 그대로다", () => {
  const issues = [
    ...closedSearchResult,
    issue("ihr-ready", { ready: true }),
    issue("ihr-0iy-follow", { ready: true, parent: "ihr-ready" }),
  ];
  const membership = (search?: string) =>
    issueListGroups(issues, NO_WAITERS, search).map(({ state, issues: grouped }) => [
      state,
      grouped.map(({ id }) => id).sort(),
    ]);

  expect(membership("ihr-0iy")).toEqual(membership());
});
