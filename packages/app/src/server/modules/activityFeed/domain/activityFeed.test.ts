import { expect, test } from "vitest";
import { exportedIssue } from "@/shared/domain/issues/issueFixture";
import type { ActivityFeedQuery } from "@/shared/contract/activityFeed";
import { activityFeedPage } from "./activityFeed";

const ALL: ActivityFeedQuery = { since: null, until: null, limit: 100 };

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

  expect(activityFeedPage(issues, ALL)).toEqual({
    entries: [
      {
        key: "t-1:closed",
        kind: "closed",
        at: 5_000,
        issueId: "t-1",
        title: "로그인 수정",
        actor: null,
        text: "수정 완료",
      },
      {
        key: "t-1:comment:c-1",
        kind: "commented",
        at: 3_000,
        issueId: "t-1",
        title: "로그인 수정",
        actor: "agent-7",
        text: "원인을 찾았다",
      },
      {
        key: "t-2:created",
        kind: "created",
        at: 2_000,
        issueId: "t-2",
        title: "문서 정리",
        actor: "bob",
        text: null,
      },
      {
        key: "t-1:created",
        kind: "created",
        at: 1_000,
        issueId: "t-1",
        title: "로그인 수정",
        actor: "alice",
        text: null,
      },
    ],
    hasMore: false,
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

  expect(activityFeedPage(issues, ALL).entries.map((entry) => entry.key)).toEqual(["t-1:created"]);
});

test("시각이 같으면 닫기, 댓글, 만들기 순서로 놓아 한 이슈의 기록이 일어난 순서의 역순이 된다", () => {
  const issues = [
    exportedIssue("t-1", {
      createdAt: 1_000,
      closedAt: 1_000,
      comments: [comment("c-1", "agent", "바로 닫는다", 1_000)],
    }),
  ];

  expect(activityFeedPage(issues, ALL).entries.map((entry) => entry.kind)).toEqual([
    "closed",
    "commented",
    "created",
  ]);
});

test("since 이상 until 미만인 기록만 남긴다", () => {
  const issues = [
    exportedIssue("t-before", { createdAt: 999 }),
    exportedIssue("t-start", { createdAt: 1_000 }),
    exportedIssue("t-last", { createdAt: 1_999 }),
    exportedIssue("t-end", { createdAt: 2_000 }),
  ];

  const page = activityFeedPage(issues, { since: 1_000, until: 2_000, limit: 100 });

  expect(page.entries.map((entry) => entry.issueId)).toEqual(["t-last", "t-start"]);
});

test("limit건까지만 돌려주고, 더 남은 기록이 있는지 알린다", () => {
  const issues = [1, 2, 3].map((n) => exportedIssue(`t-${n}`, { createdAt: n * 1_000 }));

  const first = activityFeedPage(issues, { since: null, until: null, limit: 2 });
  const all = activityFeedPage(issues, { since: null, until: null, limit: 3 });

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

  const byKey = new Map(activityFeedPage(issues, ALL).entries.map((entry) => [entry.key, entry]));

  expect(byKey.get("t-1:created")?.actor).toBeNull();
  expect(byKey.get("t-1:closed")?.text).toBeNull();
  expect(byKey.get("t-1:comment:c-1")).toMatchObject({ actor: null, text: "첫 줄 둘째 줄" });
  expect(byKey.get("t-1:comment:c-2")?.text).toBe(`${"가".repeat(200)}…`);
});
