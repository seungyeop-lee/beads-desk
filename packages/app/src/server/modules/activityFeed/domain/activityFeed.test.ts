import { expect, test } from "vitest";
import type { ExportedIssue, Issue } from "@beads-desk/bd/issue";
import type { JournalRecord } from "@beads-desk/bd/types";
import { exportedIssue, issue } from "@/shared/domain/issues/issueFixture.testkit";
import type { ActivityFeedQuery } from "@/shared/contract/activityFeed";
import { activityFeedPage, deletionsWithoutSnapshot } from "./activityFeed";

const ALL: ActivityFeedQuery = { since: null, until: null, limit: 100 };

const NO_SNAPSHOTS: ReadonlyMap<number, Issue | null> = new Map();

/** 이슈 t-1의 journal 레코드를 만듭니다. state는 그 레코드에 남은 수정 뒤의 이슈 상태입니다. */
function record(
  seq: number,
  op: string,
  at: number,
  state: Partial<ExportedIssue> | null,
  issueId = "t-1",
): JournalRecord {
  return {
    seq,
    at,
    op,
    issueId,
    actor: "agent",
    issue: state && exportedIssue(issueId, state),
  };
}

function comment(id: string, author: string, text: string, createdAt: number) {
  return { id, author, text, createdAt };
}

test("만들기, 닫기, 댓글 기록을 새것부터 놓고, 줄마다 시각과 이슈, 작성자, 닫은 사유나 댓글 본문을 담는다", () => {
  const issues = [
    exportedIssue("t-1", {
      title: "로그인 수정",
      createdAt: 1_000,
      createdBy: "alice",
      closedAt: 5_000,
      closeReason: "수정 완료",
      comments: [comment("c-1", "agent-7", "원인을 찾았다", 3_000)],
    }),
    exportedIssue("t-2", { title: "문서 정리", createdAt: 2_000, createdBy: "bob" }),
  ];

  expect(activityFeedPage(issues, null, NO_SNAPSHOTS, ALL)).toEqual({
    entries: [
      {
        key: "t-1:closed",
        kind: "closed",
        at: 5_000,
        issueId: "t-1",
        title: "로그인 수정",
        actor: null,
        text: "수정 완료",
        changes: [],
      },
      {
        key: "t-1:comment:c-1",
        kind: "commented",
        at: 3_000,
        issueId: "t-1",
        title: "로그인 수정",
        actor: "agent-7",
        text: "원인을 찾았다",
        changes: [],
      },
      {
        key: "t-2:created",
        kind: "created",
        at: 2_000,
        issueId: "t-2",
        title: "문서 정리",
        actor: "bob",
        text: null,
        changes: [],
      },
      {
        key: "t-1:created",
        kind: "created",
        at: 1_000,
        issueId: "t-1",
        title: "로그인 수정",
        actor: "alice",
        text: null,
        changes: [],
      },
    ],
    hasMore: false,
    journalEnabled: false,
  });
});

test("gate를 만들고 닫은 기록과 gate에 달린 댓글은 피드에 넣지 않는다", () => {
  const issues = [
    exportedIssue("t-1", { createdAt: 1_000 }),
    exportedIssue("t-gate", {
      issueType: "gate",
      createdAt: 2_000,
      closedAt: 3_000,
      closeReason: "Responded",
      comments: [comment("c-1", "human", "승인", 2_500)],
    }),
  ];

  expect(
    activityFeedPage(issues, null, NO_SNAPSHOTS, ALL).entries.map((entry) => entry.key),
  ).toEqual(["t-1:created"]);
});

test("시각이 같으면 닫기, 댓글, 만들기 순서로 놓아 한 이슈의 기록이 일어난 순서의 역순이 된다", () => {
  const issues = [
    exportedIssue("t-1", {
      createdAt: 1_000,
      closedAt: 1_000,
      comments: [comment("c-1", "agent", "바로 닫는다", 1_000)],
    }),
  ];

  expect(
    activityFeedPage(issues, null, NO_SNAPSHOTS, ALL).entries.map((entry) => entry.kind),
  ).toEqual(["closed", "commented", "created"]);
});

test("since 이상 until 미만인 기록만 남긴다", () => {
  const issues = [
    exportedIssue("t-before", { createdAt: 999 }),
    exportedIssue("t-start", { createdAt: 1_000 }),
    exportedIssue("t-last", { createdAt: 1_999 }),
    exportedIssue("t-end", { createdAt: 2_000 }),
  ];

  const page = activityFeedPage(issues, null, NO_SNAPSHOTS, {
    since: 1_000,
    until: 2_000,
    limit: 100,
  });

  expect(page.entries.map((entry) => entry.issueId)).toEqual(["t-last", "t-start"]);
});

test("limit건까지만 돌려주고, 더 남은 기록이 있는지 알린다", () => {
  const issues = [1, 2, 3].map((n) => exportedIssue(`t-${n}`, { createdAt: n * 1_000 }));

  const first = activityFeedPage(issues, null, NO_SNAPSHOTS, {
    since: null,
    until: null,
    limit: 2,
  });
  const all = activityFeedPage(issues, null, NO_SNAPSHOTS, { since: null, until: null, limit: 3 });

  expect(first.entries.map((entry) => entry.issueId)).toEqual(["t-3", "t-2"]);
  expect(first.hasMore).toBe(true);
  expect(all.entries.map((entry) => entry.issueId)).toEqual(["t-3", "t-2", "t-1"]);
  expect(all.hasMore).toBe(false);
});

test("댓글과 닫은 사유는 줄바꿈을 한 칸으로 줄이고 긴 본문은 앞부분만 담는다. 작성자가 기록되지 않았으면 null이다", () => {
  const long = "가".repeat(250);
  const issues = [
    exportedIssue("t-1", {
      createdAt: 1_000,
      closedAt: 3_000,
      closeReason: "  ",
      comments: [
        comment("c-1", "", "첫 줄\n\n둘째   줄", 2_000),
        comment("c-2", "agent", long, 2_500),
      ],
    }),
  ];

  const byKey = new Map(
    activityFeedPage(issues, null, NO_SNAPSHOTS, ALL).entries.map((entry) => [entry.key, entry]),
  );

  expect(byKey.get("t-1:created")?.actor).toBeNull();
  expect(byKey.get("t-1:closed")?.text).toBeNull();
  expect(byKey.get("t-1:comment:c-1")).toMatchObject({ actor: null, text: "첫 줄 둘째 줄" });
  expect(byKey.get("t-1:comment:c-2")?.text).toBe(`${"가".repeat(200)}…`);
});

test("journal의 update 레코드는 같은 이슈의 바로 앞 레코드와 비교해 바뀐 필드를 담은 수정 기록이 되고, 다시 열기는 상태가 닫힘에서 열림으로 바뀐 수정이 된다", () => {
  const issues = [exportedIssue("t-1", { title: "새 제목", createdAt: 1_000 })];
  const base = { title: "옛 제목" };
  const journal = [
    record(1, "create", 1_000, base),
    record(2, "update", 2_000, { ...base, description: "설명" }),
    record(3, "update", 3_000, { ...base, description: "설명", status: "in_progress" }),
    record(4, "update", 4_000, { title: "새 제목", description: "설명", status: "in_progress" }),
    record(5, "update", 5_000, {
      title: "새 제목",
      description: "설명",
      status: "in_progress",
      labels: ["ui"],
    }),
    record(6, "close", 6_000, {
      title: "새 제목",
      description: "설명",
      status: "closed",
      labels: ["ui"],
    }),
    record(7, "update", 7_000, {
      title: "새 제목",
      description: "설명",
      status: "open",
      labels: ["ui"],
    }),
  ];

  const updates = activityFeedPage(issues, journal, NO_SNAPSHOTS, ALL).entries.filter(
    (entry) => entry.kind === "updated",
  );

  expect(updates).toEqual([
    {
      key: "t-1:updated:7",
      kind: "updated",
      at: 7_000,
      issueId: "t-1",
      title: "새 제목",
      actor: "agent",
      text: null,
      changes: [{ field: "status", before: "closed", after: "open" }],
    },
    expect.objectContaining({
      at: 5_000,
      changes: [{ field: "labels", before: [], after: ["ui"] }],
    }),
    expect.objectContaining({
      at: 4_000,
      changes: [{ field: "title", before: "옛 제목", after: "새 제목" }],
    }),
    expect.objectContaining({
      at: 3_000,
      changes: [{ field: "status", before: "open", after: "in_progress" }],
    }),
    // 본문은 길어서 피드가 고친 사실만 보이므로 값을 담지 않습니다.
    expect.objectContaining({
      at: 2_000,
      changes: [{ field: "description", before: null, after: null }],
    }),
  ]);
});

test("마감일을 정하고 바꾸고 지운 수정은 마감 시각이 바뀐 수정 기록이 된다", () => {
  const issues = [exportedIssue("t-1", { createdAt: 1_000 })];
  const journal = [
    record(1, "create", 1_000, {}),
    record(2, "update", 2_000, { dueAt: 10_000 }),
    record(3, "update", 3_000, { dueAt: 20_000 }),
    record(4, "update", 4_000, { dueAt: null }),
  ];

  expect(
    activityFeedPage(issues, journal, NO_SNAPSHOTS, ALL)
      .entries.filter((entry) => entry.kind === "updated")
      .map((entry) => entry.changes),
  ).toEqual([
    [{ field: "dueAt", before: 20_000, after: null }],
    [{ field: "dueAt", before: 10_000, after: 20_000 }],
    [{ field: "dueAt", before: null, after: 10_000 }],
  ]);
});

test("journal을 켜기 전에 만든 이슈처럼 앞 레코드가 없는 첫 수정은 바뀐 필드 없이 수정 기록이 된다", () => {
  const issues = [exportedIssue("t-1", { createdAt: 1_000 })];
  const journal = [record(1, "update", 2_000, { priority: 1 })];

  expect(activityFeedPage(issues, journal, NO_SNAPSHOTS, ALL).entries).toContainEqual(
    expect.objectContaining({ key: "t-1:updated:1", kind: "updated", changes: [] }),
  );
});

test("journal의 create, close, comment 레코드로는 기록을 만들지 않아, 만들기와 닫기, 댓글은 bd export의 기록 한 건씩만 보인다", () => {
  const issues = [
    exportedIssue("t-1", {
      createdAt: 1_000,
      closedAt: 3_000,
      comments: [comment("c-1", "agent", "확인", 2_000)],
    }),
  ];
  const journal = [
    record(1, "create", 1_000, {}),
    record(2, "comment", 2_000, {}),
    record(3, "close", 3_000, { status: "closed" }),
  ];

  expect(
    activityFeedPage(issues, journal, NO_SNAPSHOTS, ALL).entries.map((entry) => entry.key),
  ).toEqual(["t-1:closed", "t-1:comment:c-1", "t-1:created"]);
});

test("앞 레코드와 비교해 피드가 보이는 필드가 그대로이거나 상태가 닫힘으로 바뀌기만 했으면 수정 기록을 만들지 않는다", () => {
  const issues = [exportedIssue("t-1", { createdAt: 1_000, closedAt: 3_000 })];
  const journal = [
    record(1, "create", 1_000, {}),
    record(2, "update", 2_000, { updatedAt: 2_000 }),
    record(3, "update", 3_000, { status: "closed", closedAt: 3_000 }),
  ];

  expect(
    activityFeedPage(issues, journal, NO_SNAPSHOTS, ALL).entries.map((entry) => entry.kind),
  ).toEqual(["closed", "created"]);
});

test("gate와 bd export에 없는 지운 이슈의 수정 기록은 넣지 않고, 지운 이슈는 삭제 기록만 남는다", () => {
  const issues = [exportedIssue("t-gate", { issueType: "gate", createdAt: 1_000 })];
  const journal = [
    record(1, "update", 2_000, { issueType: "gate", priority: 1 }, "t-gate"),
    record(2, "update", 2_000, { priority: 1 }, "t-gone"),
    record(3, "delete", 3_000, null, "t-gone"),
  ];

  expect(
    activityFeedPage(issues, journal, NO_SNAPSHOTS, ALL).entries.map((entry) => entry.key),
  ).toEqual(["t-gone:deleted:3"]);
});

test("수정 기록에도 since 이상 until 미만과 limit을 적용하고, 같은 시각의 수정은 나중 레코드를 앞에 놓는다", () => {
  const issues = [exportedIssue("t-1", { createdAt: 1_000 })];
  const journal = [
    record(1, "update", 1_000, { priority: 1 }),
    record(2, "update", 1_500, { priority: 2 }),
    record(3, "update", 1_500, { priority: 3 }),
    record(4, "update", 2_000, { priority: 4 }),
  ];

  const page = activityFeedPage(issues, journal, NO_SNAPSHOTS, {
    since: 1_000,
    until: 2_000,
    limit: 3,
  });

  expect(page.entries.map((entry) => entry.key)).toEqual([
    "t-1:updated:3",
    "t-1:updated:2",
    "t-1:updated:1",
  ]);
  expect(page.hasMore).toBe(true);
});

test("journal이 꺼져 있으면 null로 받아 응답에 꺼져 있다고 알리고, 켜져 있으면 레코드가 없어도 켜져 있다고 알린다", () => {
  expect(activityFeedPage([], null, NO_SNAPSHOTS, ALL).journalEnabled).toBe(false);
  expect(activityFeedPage([], [], NO_SNAPSHOTS, ALL).journalEnabled).toBe(true);
});

test("delete 레코드는 시각, 지운 사람, 같은 이슈의 앞 레코드에 남은 삭제 직전 제목을 담은 링크 대상 없는 삭제 기록이 된다", () => {
  const journal = [
    record(1, "create", 1_000, { title: "처음 제목" }, "t-gone"),
    record(2, "update", 2_000, { title: "지우기 직전 제목" }, "t-gone"),
    { ...record(3, "delete", 3_000, null, "t-gone"), actor: "agent-9" },
  ];

  expect(activityFeedPage([], journal, NO_SNAPSHOTS, ALL).entries).toEqual([
    {
      key: "t-gone:deleted:3",
      kind: "deleted",
      at: 3_000,
      issueId: "t-gone",
      title: "지우기 직전 제목",
      actor: "agent-9",
      text: null,
      changes: [],
    },
  ]);
});

test("앞 레코드가 없는 삭제는 넘겨받은 스냅샷에서 제목을 읽고, 스냅샷도 없으면 빈 제목으로 기록한다", () => {
  const journal = [
    record(5, "delete", 3_000, null, "t-old"),
    record(6, "delete", 3_000, null, "t-x"),
  ];
  const snapshots = new Map([
    [5, issue("t-old", { title: "켜기 전에 만든 작업" })],
    [6, null],
  ]);

  expect(
    activityFeedPage([], journal, snapshots, ALL).entries.map(({ issueId, title }) => [
      issueId,
      title,
    ]),
  ).toEqual([
    ["t-x", ""],
    ["t-old", "켜기 전에 만든 작업"],
  ]);
});

test("지운 gate는 앞 레코드나 스냅샷의 type으로 알아보고 삭제 기록을 만들지 않는다", () => {
  const journal = [
    record(1, "create", 1_000, { issueType: "gate" }, "t-gate"),
    record(2, "delete", 2_000, null, "t-gate"),
    record(3, "delete", 2_000, null, "t-old-gate"),
  ];
  const snapshots = new Map([[3, issue("t-old-gate", { issueType: "gate" })]]);

  expect(activityFeedPage([], journal, snapshots, ALL).entries).toEqual([]);
});

test("삭제 기록에도 since 이상 until 미만과 limit을 적용하고, 같은 시각이면 닫은 기록보다 앞에 놓는다", () => {
  const issues = [exportedIssue("t-1", { createdAt: 500, closedAt: 2_000 })];
  const journal = [
    record(1, "update", 900, { title: "a" }, "t-a"),
    record(2, "delete", 1_000, null, "t-a"),
    record(3, "update", 1_900, { title: "b" }, "t-b"),
    record(4, "delete", 2_000, null, "t-b"),
    record(5, "update", 2_900, { title: "c" }, "t-c"),
    record(6, "delete", 3_000, null, "t-c"),
  ];

  const first = activityFeedPage(issues, journal, NO_SNAPSHOTS, {
    since: 1_000,
    until: 3_000,
    limit: 2,
  });
  const rest = activityFeedPage(issues, journal, NO_SNAPSHOTS, {
    since: 1_000,
    until: 3_000,
    limit: 3,
  });

  expect(first.entries.map((entry) => entry.key)).toEqual(["t-b:deleted:4", "t-1:closed"]);
  expect(first.hasMore).toBe(true);
  expect(rest.entries.map((entry) => entry.key)).toEqual([
    "t-b:deleted:4",
    "t-1:closed",
    "t-a:deleted:2",
  ]);
  expect(rest.hasMore).toBe(false);
});

test("앞 레코드에서 삭제 직전 상태를 찾지 못한 delete 레코드만 스냅샷을 읽을 삭제로 고르고, 다시 만든 같은 id의 삭제는 따로 판단한다", () => {
  const journal = [
    record(4, "delete", 4_000, null, "t-1"),
    record(1, "create", 1_000, {}, "t-1"),
    record(2, "delete", 2_000, null, "t-1"),
    record(3, "delete", 3_000, null, "t-2"),
  ];

  expect(deletionsWithoutSnapshot(journal).map((deletion) => deletion.seq)).toEqual([3, 4]);
});
