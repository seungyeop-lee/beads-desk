import { describe, expect, test } from "vitest";
import { fakeBdWorkspace } from "./fakeBd.testkit";
import type { Issue } from "./issue";
import {
  decisionRecords,
  dependencyGraph,
  exportedIssues,
  issueEvents,
  lastIssueSnapshot,
  listIssues,
  readyIssues,
  showIssue,
  withWorkSignals,
  epicStatuses,
} from "./issueQueries";

const fakeBd = fakeBdWorkspace("beads-desk-issue-queries-");
const { useFakeBd, fixture } = fakeBd;

// 가짜 bd는 `--sandbox` 뒤의 인자 전체를 하나의 문자열로 비교하므로, 여러 describe가 쓰는 인자 문자열을 상수로 묶습니다.
const LIST_ALL_ARGS = "list --json --tree=false --all --limit 0";
const READY_ARGS = "ready --limit 0 --json";
const BLOCKED_ARGS = "blocked --json";

describe("listIssues", () => {
  test("지정한 상태의 이슈를 개수 제한 없이 조회한다", async () => {
    await useFakeBd({
      "list --json --tree=false --status open,in_progress --limit 0": {
        stdout: await fixture("list.json"),
      },
      [BLOCKED_ARGS]: { stdout: "[]" },
      [READY_ARGS]: { stdout: "[]" },
    });

    const result = await listIssues(fakeBd.workDir, ["open", "in_progress"]);

    expect(result.ok && result.value.map((issue) => issue.id)).toEqual([
      "demo-x2e",
      "demo-8g0",
      "demo-cy2",
      "demo-8g0.1",
    ]);
  });

  test("상태를 지정하지 않으면 pinned, hooked, 사용자 정의 상태까지 모든 이슈를 조회한다", async () => {
    await useFakeBd({
      [LIST_ALL_ARGS]: {
        stdout: "[]",
      },
      [BLOCKED_ARGS]: { stdout: "[]" },
      [READY_ARGS]: { stdout: "[]" },
    });

    const result = await listIssues(fakeBd.workDir, []);

    expect(result).toEqual({ ok: true, value: [] });
  });

  test("bd가 실패하면 stderr와 종료 코드를 담은 오류를 돌려준다", async () => {
    await useFakeBd({
      "list --json --tree=false --status open --limit 0": { stderr: "boom", code: 2 },
      [BLOCKED_ARGS]: { stdout: "[]" },
      [READY_ARGS]: { stdout: "[]" },
    });

    const result = await listIssues(fakeBd.workDir, ["open"]);

    expect(result).toEqual({ ok: false, error: { message: "boom\n", exitCode: 2 } });
  });

  test("bd가 stderr 없이 실패하면 종료 코드를 담은 메시지를 돌려준다", async () => {
    await useFakeBd({
      "list --json --tree=false --status open --limit 0": { code: 2 },
      [BLOCKED_ARGS]: { stdout: "[]" },
      [READY_ARGS]: { stdout: "[]" },
    });

    const result = await listIssues(fakeBd.workDir, ["open"]);

    expect(result).toEqual({
      ok: false,
      error: { message: "bd exited with code 2.", exitCode: 2 },
    });
  });

  test("bd 출력이 JSON이 아니면 오류를 돌려준다", async () => {
    await useFakeBd({
      "list --json --tree=false --status open --limit 0": { stdout: "not json" },
      [BLOCKED_ARGS]: { stdout: "[]" },
      [READY_ARGS]: { stdout: "[]" },
    });

    const result = await listIssues(fakeBd.workDir, ["open"]);

    expect(result).toEqual({
      ok: false,
      error: { kind: "unparsableOutput", exitCode: 0 },
    });
  });
});

describe("readyIssues", () => {
  test("바로 작업할 수 있는 이슈를 개수 제한 없이 조회하고, 작업 단위가 아닌 decision과 epic은 뺀다", async () => {
    const issue = (id: string, issue_type: string) => ({ id, status: "open", issue_type });
    await useFakeBd({
      [READY_ARGS]: {
        stdout: JSON.stringify([
          issue("task", "task"),
          issue("decision", "decision"),
          issue("epic", "epic"),
          issue("feature", "feature"),
        ]),
      },
    });

    const result = await readyIssues(fakeBd.workDir);

    expect(result.ok && result.value.map((issue) => issue.id)).toEqual(["task", "feature"]);
  });
});

describe("withWorkSignals", () => {
  test("막힌 이슈에는 막고 있는 이슈 id를, bd ready에 든 이슈에는 ready를 채운다", async () => {
    await useFakeBd({
      [BLOCKED_ARGS]: {
        stdout: JSON.stringify([
          { id: "waiting", status: "open", blocked_by: ["first", "second"] },
        ]),
      },
      [READY_ARGS]: { stdout: JSON.stringify([{ id: "free", status: "open" }]) },
    });
    const listed = [
      { id: "waiting", status: "open" },
      { id: "free", status: "open" },
      { id: "doing", status: "in_progress" },
    ].map((fields) => ({ ...fields, title: fields.id }) as Issue);

    const result = await withWorkSignals(
      fakeBd.workDir,
      Promise.resolve({ ok: true, value: listed }),
    );

    expect(
      result.ok && result.value.map(({ id, blockedBy, ready }) => ({ id, blockedBy, ready })),
    ).toEqual([
      { id: "waiting", blockedBy: ["first", "second"], ready: undefined },
      { id: "free", blockedBy: undefined, ready: true },
      { id: "doing", blockedBy: undefined, ready: undefined },
    ]);
  });

  test("목록 조회가 실패하면 그 오류를, bd blocked나 bd ready가 실패하면 그 오류를 돌려준다", async () => {
    await useFakeBd({
      [BLOCKED_ARGS]: { stderr: "boom", code: 1 },
      [READY_ARGS]: { stdout: "[]" },
    });
    const listError = { ok: false as const, error: { message: "list failed", exitCode: 1 } };

    expect(await withWorkSignals(fakeBd.workDir, Promise.resolve(listError))).toEqual(listError);
    expect(await withWorkSignals(fakeBd.workDir, Promise.resolve({ ok: true, value: [] }))).toEqual(
      {
        ok: false,
        error: { message: "boom\n", exitCode: 1 },
      },
    );
  });
});

describe("epicStatuses", () => {
  test("모든 이슈를 한 번에 읽어 epic마다 직접 하위 이슈와 닫힌 하위 이슈를 센다", async () => {
    await useFakeBd({
      [LIST_ALL_ARGS]: {
        stdout: JSON.stringify([
          { id: "e-1", issue_type: "epic", status: "open" },
          { id: "e-1.1", status: "closed", parent: "e-1" },
          { id: "e-1.2", status: "hooked", parent: "e-1" },
          { id: "e-1.2.1", status: "open", parent: "e-1.2" },
          { id: "e-2", issue_type: "epic", status: "open" },
          { id: "e-2.1", status: "closed", parent: "e-2" },
          { id: "e-3", issue_type: "epic", status: "closed" },
          { id: "e-4", issue_type: "epic", status: "open" },
        ]),
      },
    });

    const result = await epicStatuses(fakeBd.workDir);

    expect(
      result.ok &&
        result.value.map((status) => [status.epic.id, status.totalChildren, status.closedChildren]),
    ).toEqual([
      ["e-1", 2, 1],
      ["e-2", 1, 1],
      ["e-3", 0, 0],
      ["e-4", 0, 0],
    ]);
  });

  test("저장 상태가 진행 중인 직접 하위 이슈를 세고, 의존 관계에 막힌 이슈와 하위 에픽도 진행 중으로 센다", async () => {
    await useFakeBd({
      [LIST_ALL_ARGS]: {
        stdout: JSON.stringify([
          { id: "e-1", issue_type: "epic", status: "open" },
          { id: "e-1.1", status: "closed", parent: "e-1" },
          { id: "e-1.2", status: "in_progress", parent: "e-1" },
          { id: "e-1.3", status: "in_progress", parent: "e-1", blocked_by: ["e-1.2"] },
          { id: "e-1.4", issue_type: "epic", status: "in_progress", parent: "e-1" },
          { id: "e-1.5", status: "open", parent: "e-1" },
          { id: "e-1.4.1", status: "in_progress", parent: "e-1.4" },
        ]),
      },
    });

    const result = await epicStatuses(fakeBd.workDir);

    expect(
      result.ok &&
        result.value.map(({ epic, totalChildren, closedChildren, inProgressChildren }) => [
          epic.id,
          totalChildren,
          closedChildren,
          inProgressChildren,
        ]),
    ).toEqual([
      ["e-1", 5, 1, 3],
      ["e-1.4", 1, 0, 1],
    ]);
  });

  test("작업 상태를 정하는 bd blocked와 bd ready는 실행하지 않는다", async () => {
    await useFakeBd({ [LIST_ALL_ARGS]: { stdout: "[]" } });

    await epicStatuses(fakeBd.workDir);

    expect(await fakeBd.callsLog()).toBe(`${fakeBd.workDir} --sandbox ${LIST_ALL_ARGS}\n`);
  });

  test("bd가 실패하면 오류를 돌려준다", async () => {
    await useFakeBd({
      [LIST_ALL_ARGS]: { stderr: "boom", code: 1 },
    });

    const result = await epicStatuses(fakeBd.workDir);

    expect(result).toEqual({ ok: false, error: { message: "boom\n", exitCode: 1 } });
  });
});

describe("decisionRecords", () => {
  const listDecisions = `${LIST_ALL_ARGS} --type=decision`;

  test("모든 상태의 decision을 읽고, 대체된 decision에는 대체한 이슈를 붙인다", async () => {
    await useFakeBd({
      [listDecisions]: {
        stdout: JSON.stringify([
          { id: "d-2", issue_type: "decision", status: "open" },
          {
            id: "d-1",
            issue_type: "decision",
            status: "closed",
            dependencies: [
              { issue_id: "d-1", depends_on_id: "t-1", type: "blocks" },
              { issue_id: "d-1", depends_on_id: "d-2", type: "supersedes" },
            ],
          },
        ]),
      },
    });

    const result = await decisionRecords(fakeBd.workDir);

    expect(
      result.ok && result.value.map((record) => [record.decision.id, record.supersededBy]),
    ).toEqual([
      ["d-2", null],
      ["d-1", "d-2"],
    ]);
  });

  test("bd가 실패하면 오류를 돌려준다", async () => {
    await useFakeBd({ [listDecisions]: { stderr: "boom", code: 1 } });

    const result = await decisionRecords(fakeBd.workDir);

    expect(result).toEqual({ ok: false, error: { message: "boom\n", exitCode: 1 } });
  });
});

describe("showIssue", () => {
  test("댓글과 이 이슈에 의존하는 이슈까지 담아 조회한다", async () => {
    await useFakeBd({
      "show --json --include-comments --include-dependents -- demo-865.1": {
        stdout: await fixture("show.json"),
      },
    });

    const result = await showIssue(fakeBd.workDir, "demo-865.1");

    expect(result.ok && result.value.comments.length).toBe(1);
    expect(result.ok && result.value.dependents.length).toBe(1);
  });

  test("id가 비어 있으면 bd를 실행하지 않고 오류를 돌려준다", async () => {
    await useFakeBd({});

    const result = await showIssue(fakeBd.workDir, " ");

    expect(result).toEqual({
      ok: false,
      error: { kind: "emptyIssueId", exitCode: null },
    });
  });

  test("bd가 실패하면 오류를 돌려준다", async () => {
    await useFakeBd({
      "show --json --include-comments --include-dependents -- demo-zzz": {
        stderr: "Issue demo-zzz not found",
        code: 1,
      },
    });

    const result = await showIssue(fakeBd.workDir, "demo-zzz");

    expect(result).toEqual({
      ok: false,
      error: { message: "Issue demo-zzz not found\n", exitCode: 1 },
    });
  });
});

describe("dependencyGraph", () => {
  const signals = {
    [BLOCKED_ARGS]: { stdout: JSON.stringify([{ id: "b", status: "open", blocked_by: ["a"] }]) },
    [READY_ARGS]: { stdout: JSON.stringify([{ id: "a", status: "open" }]) },
  };
  const listed = JSON.stringify([
    { id: "a", status: "open" },
    {
      id: "b",
      status: "open",
      dependencies: [
        { issue_id: "b", depends_on_id: "a", type: "blocks" },
        { issue_id: "b", depends_on_id: "epic", type: "parent-child" },
      ],
    },
  ]);

  test("모든 상태의 이슈와 그 의존 관계를 모든 유형으로 한 번에 읽고, 작업 상태를 정하는 값을 채운다", async () => {
    await useFakeBd({
      [`${LIST_ALL_ARGS} --include-gates`]: { stdout: listed },
      ...signals,
    });

    const result = await dependencyGraph(fakeBd.workDir);

    expect(result.ok && result.value.dependencies).toEqual([
      { issueId: "b", dependsOnId: "a", type: "blocks", createdAt: 0 },
      { issueId: "b", dependsOnId: "epic", type: "parent-child", createdAt: 0 },
    ]);
    expect(result.ok && result.value.issues).toMatchObject([
      { id: "a", ready: true },
      { id: "b", blockedBy: ["a"] },
    ]);
  });

  test("열린 human gate와 닫힌 gate, 다른 await 유형의 gate와 blocks 관계를 보존한다", async () => {
    const gates = [
      { id: "human", status: "open", issue_type: "gate", await_type: "human" },
      { id: "closed", status: "closed", issue_type: "gate", await_type: "human" },
      { id: "pr", status: "open", issue_type: "gate", await_type: "gh:pr" },
    ];
    await useFakeBd({
      [`${LIST_ALL_ARGS} --include-gates`]: {
        stdout: JSON.stringify([
          ...gates,
          {
            id: "work",
            status: "closed",
            dependencies: gates.map(({ id }) => ({
              issue_id: "work",
              depends_on_id: id,
              type: "blocks",
            })),
          },
        ]),
      },
      ...signals,
    });

    const result = await dependencyGraph(fakeBd.workDir);

    expect(result.ok && result.value.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "human",
          issueType: "gate",
          status: "open",
        }),
        expect.objectContaining({ id: "closed", issueType: "gate", status: "closed" }),
        expect.objectContaining({ id: "pr", issueType: "gate" }),
      ]),
    );
    expect(result.ok && result.value.dependencies).toEqual(
      gates.map(({ id }) => ({
        issueId: "work",
        dependsOnId: id,
        type: "blocks",
        createdAt: 0,
      })),
    );
  });
});

describe("issueEvents", () => {
  test("이슈의 변경 이벤트를 개수 제한 없이 읽는다", async () => {
    await useFakeBd({
      "history --events --json --limit 0 -- demo-1": {
        stdout: JSON.stringify([
          { id: "e-1", event_type: "created", actor: "a", created_at: "2026-10-15T00:00:00Z" },
        ]),
      },
    });

    const result = await issueEvents(fakeBd.workDir, " demo-1 ");

    expect(result.ok && result.value.map((event) => event.type)).toEqual(["created"]);
  });

  test("이슈 id가 비어 있으면 bd를 실행하지 않고 거부한다", async () => {
    await useFakeBd({});

    expect(await issueEvents(fakeBd.workDir, " ")).toMatchObject({
      ok: false,
      error: { kind: "emptyIssueId", exitCode: null },
    });
  });
});

describe("lastIssueSnapshot", () => {
  test("bd history의 마지막 스냅샷 한 건에서 이슈를 읽는다", async () => {
    await useFakeBd({
      "history --json --limit 1 -- demo-1": {
        stdout: JSON.stringify([
          {
            CommitHash: "h-1",
            Issue: { id: "demo-1", title: "지운 작업", status: "open", issue_type: "bug" },
          },
        ]),
      },
    });

    const result = await lastIssueSnapshot(fakeBd.workDir, " demo-1 ");

    expect(result.ok && result.value).toMatchObject({ title: "지운 작업", issueType: "bug" });
  });

  test("기록이 없는 id이면 bd가 출력한 null대로 null을 돌려준다", async () => {
    await useFakeBd({ "history --json --limit 1 -- demo-x": { stdout: "null" } });

    expect(await lastIssueSnapshot(fakeBd.workDir, "demo-x")).toEqual({ ok: true, value: null });
  });
});

describe("exportedIssues", () => {
  // bd 1.3.1의 bd export 출력에서 필드 이름과 형태를 옮긴 레코드입니다. 값이 빈 필드는 bd가 출력하지 않습니다.
  const exported = [
    {
      _type: "issue",
      id: "t-1",
      title: "로그인 오류",
      description: "세션 토큰이 만료된다",
      design: "토큰을 다시 받는다",
      acceptance_criteria: "다시 로그인하지 않는다",
      notes: "재현은 하루 뒤에 된다",
      status: "closed",
      priority: 1,
      issue_type: "bug",
      created_at: "2026-10-18T10:35:58Z",
      created_by: "agent-1",
      updated_at: "2026-10-18T10:44:41Z",
      closed_at: "2026-10-18T10:44:41Z",
      close_reason: "고쳤습니다",
      comments: [
        {
          id: "c-1",
          issue_id: "t-1",
          author: "agent-1",
          text: "Commit: abc123 fix: 토큰 갱신",
          created_at: "2026-10-18T10:44:40Z",
        },
      ],
      dependency_count: 0,
      dependent_count: 1,
      comment_count: 1,
    },
    {
      _type: "issue",
      id: "t-2",
      title: "Review: t-1",
      description: "Ad-hoc gate blocking t-1",
      status: "open",
      priority: 2,
      issue_type: "gate",
      await_type: "human",
      created_at: "2026-10-18T11:00:00Z",
      created_by: "agent-1",
      updated_at: "2026-10-18T11:00:00Z",
      dependency_count: 0,
      dependent_count: 1,
      comment_count: 0,
    },
  ];

  test("닫힌 이슈와 gate까지 레코드마다 본문 필드, 댓글, 만든 사람과 닫은 기록을 읽는다", async () => {
    await useFakeBd({
      export: { stdout: exported.map((record) => JSON.stringify(record)).join("\n") + "\n" },
    });

    const result = await exportedIssues(fakeBd.workDir);

    expect(result).toMatchObject({
      ok: true,
      value: [
        {
          id: "t-1",
          status: "closed",
          issueType: "bug",
          description: "세션 토큰이 만료된다",
          design: "토큰을 다시 받는다",
          acceptanceCriteria: "다시 로그인하지 않는다",
          notes: "재현은 하루 뒤에 된다",
          createdAt: Date.parse("2026-10-18T10:35:58Z"),
          createdBy: "agent-1",
          closedAt: Date.parse("2026-10-18T10:44:41Z"),
          closeReason: "고쳤습니다",
          comments: [
            {
              id: "c-1",
              author: "agent-1",
              text: "Commit: abc123 fix: 토큰 갱신",
              createdAt: Date.parse("2026-10-18T10:44:40Z"),
            },
          ],
        },
        {
          id: "t-2",
          issueType: "gate",
          awaitType: "human",
          description: "Ad-hoc gate blocking t-1",
          notes: "",
          closeReason: null,
          comments: [],
        },
      ],
    });
  });

  // 가짜 bd는 인자 문자열 전체가 같을 때만 응답하므로, 응답을 받았다면 다른 옵션 없이 실행한 것입니다.
  test("memory를 함께 내놓는 --all과 --include-memories 없이 실행한다", async () => {
    await useFakeBd({ export: { stdout: "" } });

    expect(await exportedIssues(fakeBd.workDir)).toEqual({ ok: true, value: [] });
  });

  test("JSON으로 읽을 수 없는 줄이 있으면 오류를 돌려준다", async () => {
    await useFakeBd({ export: { stdout: `${JSON.stringify(exported[0])}\nnot json\n` } });

    expect(await exportedIssues(fakeBd.workDir)).toMatchObject({
      ok: false,
      error: { kind: "unparsableOutput", exitCode: 0 },
    });
  });
});
