import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import {
  awaitsHumanDecision,
  isOpenHumanGateLink,
  parseIssueDetail,
  parseIssueEvents,
  parseIssues,
} from "./issue";

async function fixture(name: string): Promise<unknown> {
  return JSON.parse(await readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
}

describe("parseIssues", () => {
  test("bd list 출력을 Issue 목록으로 바꾼다", async () => {
    const issues = parseIssues(await fixture("list.json"));

    expect(issues.map((issue) => issue.id)).toEqual([
      "demo-x2e",
      "demo-8g0",
      "demo-cy2",
      "demo-8g0.1",
    ]);
    expect(issues[3]).toEqual({
      id: "demo-8g0.1",
      title: "Child task",
      status: "open",
      priority: 2,
      issueType: "task",
      assignee: "alice",
      labels: ["ui"],
      parent: "demo-8g0",
      dependencyCount: 1,
      dependentCount: 0,
      createdAt: Date.parse("2026-10-13T12:04:51Z"),
      updatedAt: Date.parse("2026-10-13T12:07:18Z"),
      startedAt: null,
      closedAt: null,
      deferUntil: null,
    });
  });

  test("착수한 이슈는 startedAt을 epoch ms로 담는다", async () => {
    const started = parseIssues(await fixture("list.json")).find(
      (issue) => issue.id === "demo-x2e",
    );

    expect(started?.startedAt).toBe(Date.parse("2026-10-13T12:04:59Z"));
  });

  test("닫힌 이슈는 closedAt을 epoch ms로 담는다", async () => {
    const closed = parseIssues(await fixture("list.json")).find((issue) => issue.id === "demo-cy2");

    expect(closed?.status).toBe("closed");
    expect(closed?.closedAt).toBeTypeOf("number");
  });

  test("보류 기한이 있는 이슈는 deferUntil을 epoch ms로 담는다", () => {
    const [deferred] = parseIssues([
      { id: "x-1", status: "deferred", defer_until: "2026-10-16T13:04:46Z" },
    ]);

    expect(deferred?.deferUntil).toBe(Date.parse("2026-10-16T13:04:46Z"));
  });

  test("id가 없는 항목은 건너뛰고, 없는 필드는 빈 값으로 채운다", () => {
    const issues = parseIssues([{ title: "no id" }, { id: "x-1" }]);

    expect(issues).toEqual([
      {
        id: "x-1",
        title: "",
        status: "",
        priority: null,
        issueType: "",
        assignee: null,
        labels: [],
        parent: null,
        dependencyCount: 0,
        dependentCount: 0,
        createdAt: 0,
        updatedAt: 0,
        startedAt: null,
        closedAt: null,
        deferUntil: null,
      },
    ]);
  });

  test("배열이 아니면 빈 목록을 돌려준다", () => {
    expect(parseIssues({ error: "no issues" })).toEqual([]);
  });
});

describe("parseIssueDetail", () => {
  test("bd show 출력을 본문, 의존 관계, 댓글이 담긴 상세로 바꾼다", async () => {
    const [shown] = (await fixture("show.json")) as unknown[];

    const detail = parseIssueDetail(shown);

    expect(detail).toMatchObject({
      id: "demo-865.1",
      description: "Body **bold**",
      design: "Design",
      acceptanceCriteria: "Accept",
      notes: "Notes",
      closeReason: null,
      labels: ["backend", "ui"],
      parent: "demo-865",
    });
    expect(detail?.dependencies).toEqual([
      {
        id: "demo-af8",
        title: "Prereq",
        status: "closed",
        priority: 2,
        issueType: "task",
        dependencyType: "blocks",
        awaitType: "",
      },
      {
        id: "demo-865",
        title: "Epic",
        status: "open",
        priority: 2,
        issueType: "epic",
        dependencyType: "parent-child",
        awaitType: "",
      },
    ]);
    expect(detail?.dependents.map((link) => [link.id, link.dependencyType])).toEqual([
      ["demo-nk4", "blocks"],
    ]);
    expect(detail?.comments).toEqual([
      {
        id: "139682b3-9a73-5e2a-9dc3-9bc2eccf6e6b",
        author: "tester",
        text: "First comment",
        createdAt: Date.parse("2026-10-13T13:14:21Z"),
      },
    ]);
  });

  test("의존 이슈가 gate이면 gate가 기다리는 대상을 담는다", () => {
    const detail = parseIssueDetail({
      id: "x-1",
      dependencies: [
        {
          id: "x-gate",
          title: "Review: x-1",
          status: "open",
          issue_type: "gate",
          await_type: "human",
          dependency_type: "blocks",
        },
      ],
    });

    expect(detail?.dependencies).toMatchObject([
      { id: "x-gate", issueType: "gate", awaitType: "human" },
    ]);
  });

  test("본문과 목록 필드가 없으면 빈 값으로 채운다", () => {
    expect(parseIssueDetail({ id: "x-1", close_reason: "Done" })).toMatchObject({
      description: "",
      design: "",
      acceptanceCriteria: "",
      notes: "",
      closeReason: "Done",
      dependencies: [],
      dependents: [],
      comments: [],
    });
  });

  test("id가 없으면 null을 돌려준다", () => {
    expect(parseIssueDetail({ title: "no id" })).toBeNull();
  });
});

describe("awaitsHumanDecision", () => {
  test("human 라벨이 붙은 닫히지 않은 이슈만 판단을 기다린다", () => {
    expect(awaitsHumanDecision({ status: "in_progress", labels: ["ops", "human"] })).toBe(true);
    expect(awaitsHumanDecision({ status: "closed", labels: ["human"] })).toBe(false);
    expect(awaitsHumanDecision({ status: "open", labels: ["ops"] })).toBe(false);
  });
});

describe("isOpenHumanGateLink", () => {
  test("열린 human gate만 사람이 닫아야 하는 gate로 본다", () => {
    const gate = { issueType: "gate", awaitType: "human", status: "open" };

    expect(isOpenHumanGateLink(gate)).toBe(true);
    expect(isOpenHumanGateLink({ ...gate, status: "closed" })).toBe(false);
    expect(isOpenHumanGateLink({ ...gate, awaitType: "timer" })).toBe(false);
    expect(isOpenHumanGateLink({ ...gate, issueType: "task" })).toBe(false);
  });
});

describe("parseIssueEvents", () => {
  test("bd history --events 출력을 이벤트 종류별로 해석한다", async () => {
    const events = parseIssueEvents(await fixture("history-events.json"));
    const byId = (prefix: string) => events.find((event) => event.id.startsWith(prefix));

    expect(events).toHaveLength(12);
    expect(byId("2cdf4fca")).toEqual({
      id: expect.stringMatching(/^2cdf4fca/),
      type: "created",
      actor: "tester",
      createdAt: Date.parse("2026-10-15T13:58:09Z"),
      changes: [],
      dependency: null,
      label: null,
      text: null,
    });
    expect(byId("b15bc41d")?.changes).toEqual([
      { field: "priority", before: 2, after: 1 },
      { field: "title", before: "A 이슈", after: "A 새 제목" },
    ]);
    expect(byId("3202107c")?.changes).toEqual([
      { field: "assignee", before: null, after: "tester" },
      { field: "status", before: "open", after: "in_progress" },
    ]);
    expect(byId("8927f86e")?.changes).toEqual([
      { field: "deferUntil", before: null, after: "2026-11-30T15:00:00Z" },
      { field: "status", before: "blocked", after: "deferred" },
    ]);
    expect(byId("e883be5d")).toMatchObject({ type: "closed", changes: [], text: "끝냈음" });
    expect(byId("3c8297e5")?.dependency).toEqual({ dependsOnId: "demo-b", type: "blocks" });
    expect(byId("5d984c0a")?.dependency).toEqual({ dependsOnId: "demo-b", type: null });
    expect(byId("f931f83b")).toMatchObject({ type: "label_added", label: "ui", text: null });
    expect(byId("3cc56c75")).toMatchObject({ type: "label_removed", label: "ui", text: null });
  });

  test("형식을 모르는 기록은 원문을 text로 남긴다", () => {
    const [event] = parseIssueEvents([
      { id: "e-1", event_type: "compacted", actor: "a", new_value: "level 1", created_at: "x" },
    ]);

    expect(event).toMatchObject({ type: "compacted", text: "level 1", createdAt: 0, changes: [] });
  });

  test("이슈가 없어 bd가 null을 출력하면 빈 목록을 돌려준다", () => {
    expect(parseIssueEvents(null)).toEqual([]);
  });
});
