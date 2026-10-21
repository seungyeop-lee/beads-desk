import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { fakeBdWorkspace } from "./fakeBd.testkit";
import { parseIssues, type Issue } from "./issue";
import {
  boardIssues,
  decisionRecords,
  dependencyGraph,
  duplicateCandidates,
  epicDescendants,
  epicStatuses,
  exportedIssues,
  humanDecisionIssues,
  humanGates,
  issueEvents,
  lintFindings,
  listIssues,
  openChangeFingerprint,
  openGates,
  orphanIssues,
  previousGateRounds,
  readyIssues,
  showIssue,
  staleIssues,
  withWorkSignals,
} from "./queries";

const fakeBd = fakeBdWorkspace("beads-desk-queries-");
const { useFakeBd, fixture } = fakeBd;

// 가짜 bd는 `--sandbox` 뒤의 인자 전체를 하나의 문자열로 비교하므로, 여러 describe가 쓰는 인자 문자열을 상수로 묶습니다.
const LIST_OPEN_ARGS = "list --json --tree=false --limit 0";
const LIST_ALL_ARGS = "list --json --tree=false --all --limit 0";
const LIST_GATES_ARGS = "list --json --tree=false --type=gate --all --limit 0";
const READY_ARGS = "ready --limit 0 --json";
const BLOCKED_ARGS = "blocked --json";

describe("listIssues", () => {
  test("지정한 상태의 이슈를 개수 제한 없이 조회한다", async () => {
    await useFakeBd({
      "list --json --tree=false --status open,in_progress --limit 0": {
        stdout: await fixture("list.json"),
      },
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
    });

    const result = await listIssues(fakeBd.workDir, []);

    expect(result).toEqual({ ok: true, value: [] });
  });

  test("bd가 실패하면 stderr와 종료 코드를 담은 오류를 돌려준다", async () => {
    await useFakeBd({
      "list --json --tree=false --status open --limit 0": { stderr: "boom", code: 2 },
    });

    const result = await listIssues(fakeBd.workDir, ["open"]);

    expect(result).toEqual({ ok: false, error: { message: "boom\n", exitCode: 2 } });
  });

  test("bd가 stderr 없이 실패하면 종료 코드를 담은 메시지를 돌려준다", async () => {
    await useFakeBd({
      "list --json --tree=false --status open --limit 0": { code: 2 },
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

  test("bd가 실패하면 오류를 돌려준다", async () => {
    await useFakeBd({ [LIST_ALL_ARGS]: { stderr: "boom", code: 1 } });

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

describe("humanGates", () => {
  test("열린 human gate만 읽고, 막고 있는 이슈와 이전 라운드 수를 blocks 의존 관계에서 찾는다", async () => {
    await useFakeBd({
      [LIST_GATES_ARGS]: {
        stdout: JSON.stringify([
          {
            id: "g-1",
            title: "Review: t-1",
            issue_type: "gate",
            await_type: "human",
            status: "open",
            description: "Ad-hoc gate blocking t-1\n\nReason: 로그인 화면 수정\n\n두 번째 줄",
          },
          {
            id: "g-2",
            issue_type: "gate",
            await_type: "human",
            status: "open",
            description: "Ad-hoc gate blocking t-9",
          },
          { id: "g-3", issue_type: "gate", await_type: "timer", status: "open" },
          { id: "g-old", issue_type: "gate", await_type: "human", status: "closed" },
        ]),
      },
      [LIST_OPEN_ARGS]: {
        stdout: JSON.stringify([
          {
            id: "t-1",
            title: "로그인 화면",
            status: "in_progress",
            dependencies: [
              {
                issue_id: "t-1",
                depends_on_id: "g-1",
                type: "blocks",
                created_at: "2026-01-02T00:00:00Z",
              },
              {
                issue_id: "t-1",
                depends_on_id: "g-old",
                type: "blocks",
                created_at: "2026-01-01T00:00:00Z",
              },
              { issue_id: "t-1", depends_on_id: "g-2", type: "related" },
            ],
          },
          {
            id: "t-2",
            title: "회원 가입 화면",
            status: "open",
            dependencies: [
              {
                issue_id: "t-2",
                depends_on_id: "g-1",
                type: "blocks",
                created_at: "2026-01-02T00:00:00Z",
              },
            ],
          },
        ]),
      },
    });

    const result = await humanGates(fakeBd.workDir);

    expect(
      result.ok &&
        result.value.map(({ gate, reason, blocks, previousGateCount }) => [
          gate.id,
          reason,
          blocks.map(({ id }) => id),
          previousGateCount,
        ]),
    ).toEqual([
      ["g-1", "로그인 화면 수정\n\n두 번째 줄", ["t-1", "t-2"], 0],
      ["g-2", "", [], 0],
    ]);
  });

  test("gate가 여러 작업을 막으면 그 작업 전부를 막았던 닫힌 gate만 이전 라운드로 센다", async () => {
    await useFakeBd({
      [LIST_GATES_ARGS]: {
        stdout: JSON.stringify([
          { id: "g-1", issue_type: "gate", await_type: "human", status: "open" },
          { id: "g-both", issue_type: "gate", await_type: "human", status: "closed" },
          { id: "g-one", issue_type: "gate", await_type: "human", status: "closed" },
        ]),
      },
      [LIST_OPEN_ARGS]: {
        stdout: JSON.stringify([
          {
            id: "t-1",
            status: "open",
            dependencies: [
              { issue_id: "t-1", depends_on_id: "g-1", type: "blocks" },
              { issue_id: "t-1", depends_on_id: "g-both", type: "blocks" },
              { issue_id: "t-1", depends_on_id: "g-one", type: "blocks" },
            ],
          },
          {
            id: "t-2",
            status: "open",
            dependencies: [
              { issue_id: "t-2", depends_on_id: "g-1", type: "blocks" },
              { issue_id: "t-2", depends_on_id: "g-both", type: "blocks" },
            ],
          },
        ]),
      },
    });

    const result = await humanGates(fakeBd.workDir);

    expect(
      result.ok && result.value.map(({ gate, previousGateCount }) => [gate.id, previousGateCount]),
    ).toEqual([["g-1", 1]]);
  });

  test("bd gate create가 만든 설명 형식이 아니면 설명 전체를 사유로 읽는다", async () => {
    await useFakeBd({
      [LIST_GATES_ARGS]: {
        stdout: JSON.stringify([
          {
            id: "g-1",
            issue_type: "gate",
            await_type: "human",
            status: "open",
            description: "배포 전에 확인해 주세요",
          },
        ]),
      },
      [LIST_OPEN_ARGS]: { stdout: "[]" },
    });

    const result = await humanGates(fakeBd.workDir);

    expect(result.ok && result.value[0]?.reason).toBe("배포 전에 확인해 주세요");
  });

  test("조회가 하나라도 실패하면 오류를 돌려준다", async () => {
    await useFakeBd({
      [LIST_GATES_ARGS]: { stdout: "[]" },
      [LIST_OPEN_ARGS]: { stderr: "boom", code: 1 },
    });

    expect(await humanGates(fakeBd.workDir)).toEqual({
      ok: false,
      error: { message: "boom\n", exitCode: 1 },
    });
  });
});

describe("previousGateRounds", () => {
  test("같은 작업을 막았던 닫힌 gate를 간선이 생긴 순으로 읽어 코멘트와 닫은 사유를 돌려준다", async () => {
    await useFakeBd({
      [LIST_GATES_ARGS]: {
        stdout: JSON.stringify([
          { id: "g-cur", issue_type: "gate", await_type: "human", status: "open" },
          {
            id: "g-old1",
            title: "Review: t-1",
            issue_type: "gate",
            await_type: "human",
            status: "closed",
            labels: ["human"],
            closed_at: "2026-01-02T00:00:00Z",
          },
          { id: "g-old2", issue_type: "gate", await_type: "human", status: "closed" },
          { id: "g-timer", issue_type: "gate", await_type: "timer", status: "closed" },
        ]),
      },
      [LIST_OPEN_ARGS]: {
        stdout: JSON.stringify([
          {
            id: "t-1",
            status: "open",
            dependencies: [
              {
                issue_id: "t-1",
                depends_on_id: "g-old2",
                type: "blocks",
                created_at: "2026-01-02T00:00:00Z",
              },
              {
                issue_id: "t-1",
                depends_on_id: "g-timer",
                type: "blocks",
                created_at: "2026-01-02T12:00:00Z",
              },
              {
                issue_id: "t-1",
                depends_on_id: "g-old1",
                type: "blocks",
                created_at: "2026-01-01T00:00:00Z",
              },
              {
                issue_id: "t-1",
                depends_on_id: "g-cur",
                type: "blocks",
                created_at: "2026-01-03T00:00:00Z",
              },
            ],
          },
        ]),
      },
      "show --json --include-comments --include-dependents -- g-old1": {
        stdout: JSON.stringify({
          id: "g-old1",
          issue_type: "gate",
          status: "closed",
          close_reason: "Responded",
          comments: [
            {
              id: "c-1",
              author: "reviewer",
              text: "정정: 버튼 색도 바꿔 주세요.",
              created_at: "2026-01-01T01:00:00Z",
            },
            {
              id: "c-2",
              author: "reviewer",
              text: "Response: 승인",
              created_at: "2026-01-01T02:00:00Z",
            },
          ],
        }),
      },
      "show --json --include-comments --include-dependents -- g-old2": {
        stdout: JSON.stringify({
          id: "g-old2",
          issue_type: "gate",
          status: "closed",
          comments: [],
        }),
      },
      "show --json --include-comments --include-dependents -- g-timer": {
        stdout: JSON.stringify({
          id: "g-timer",
          issue_type: "gate",
          status: "closed",
          comments: [],
        }),
      },
    });

    const result = await previousGateRounds(fakeBd.workDir, "g-cur");

    expect(
      result.ok &&
        result.value.map(({ gate, closeReason, comments }) => [
          gate.id,
          gate.labels,
          closeReason,
          comments.map(({ text }) => text),
        ]),
    ).toEqual([
      ["g-old1", ["human"], "Responded", ["정정: 버튼 색도 바꿔 주세요.", "Response: 승인"]],
      ["g-old2", [], null, []],
      ["g-timer", [], null, []],
    ]);
  });

  test("같은 초에 시작한 라운드는 게이트 id 오름차순으로 돌려준다", async () => {
    // bd가 간선 시각을 초 단위로 저장하므로 같은 초에 시작한 라운드는 정렬 동률이다.
    // 두 목록 모두 g-old2를 먼저 나오게 해, 입력 순서가 아니라 동률 규칙이 순서를 정함을 확인한다.
    await useFakeBd({
      [LIST_GATES_ARGS]: {
        stdout: JSON.stringify([
          { id: "g-cur", issue_type: "gate", await_type: "human", status: "open" },
          { id: "g-old2", issue_type: "gate", await_type: "human", status: "closed" },
          { id: "g-old1", issue_type: "gate", await_type: "human", status: "closed" },
        ]),
      },
      [LIST_OPEN_ARGS]: {
        stdout: JSON.stringify([
          {
            id: "t-1",
            status: "open",
            dependencies: [
              {
                issue_id: "t-1",
                depends_on_id: "g-old2",
                type: "blocks",
                created_at: "2026-01-01T00:00:00Z",
              },
              {
                issue_id: "t-1",
                depends_on_id: "g-old1",
                type: "blocks",
                created_at: "2026-01-01T00:00:00Z",
              },
              {
                issue_id: "t-1",
                depends_on_id: "g-cur",
                type: "blocks",
                created_at: "2026-01-02T00:00:00Z",
              },
            ],
          },
        ]),
      },
      "show --json --include-comments --include-dependents -- g-old1": {
        stdout: JSON.stringify({
          id: "g-old1",
          issue_type: "gate",
          status: "closed",
          comments: [],
        }),
      },
      "show --json --include-comments --include-dependents -- g-old2": {
        stdout: JSON.stringify({
          id: "g-old2",
          issue_type: "gate",
          status: "closed",
          comments: [],
        }),
      },
    });

    const result = await previousGateRounds(fakeBd.workDir, "g-cur");

    expect(result.ok && result.value.map(({ gate }) => gate.id)).toEqual(["g-old1", "g-old2"]);
  });

  test("게이트 id가 비어 있으면 bd를 실행하지 않고 오류를 돌려준다", async () => {
    expect(await previousGateRounds(fakeBd.workDir, " ")).toEqual({
      ok: false,
      error: { kind: "emptyGateId", exitCode: null },
    });
  });

  test("막는 작업이 없거나 알 수 없는 gate는 이전 라운드가 없다", async () => {
    await useFakeBd({
      [LIST_GATES_ARGS]: {
        stdout: JSON.stringify([
          { id: "g-old", issue_type: "gate", await_type: "human", status: "closed" },
        ]),
      },
      [LIST_OPEN_ARGS]: { stdout: "[]" },
    });

    const result = await previousGateRounds(fakeBd.workDir, "g-cur");

    expect(result).toEqual({ ok: true, value: [] });
  });

  test("이전 라운드 상세 조회가 실패하면 오류를 돌려준다", async () => {
    await useFakeBd({
      [LIST_GATES_ARGS]: {
        stdout: JSON.stringify([
          { id: "g-cur", issue_type: "gate", await_type: "human", status: "open" },
          { id: "g-old", issue_type: "gate", await_type: "human", status: "closed" },
        ]),
      },
      [LIST_OPEN_ARGS]: {
        stdout: JSON.stringify([
          {
            id: "t-1",
            status: "open",
            dependencies: [
              {
                issue_id: "t-1",
                depends_on_id: "g-old",
                type: "blocks",
                created_at: "2026-01-01T00:00:00Z",
              },
              {
                issue_id: "t-1",
                depends_on_id: "g-cur",
                type: "blocks",
                created_at: "2026-01-02T00:00:00Z",
              },
            ],
          },
        ]),
      },
      "show --json --include-comments --include-dependents -- g-old": { stderr: "boom", code: 1 },
    });

    expect(await previousGateRounds(fakeBd.workDir, "g-cur")).toEqual({
      ok: false,
      error: { message: "boom\n", exitCode: 1 },
    });
  });
});

describe("humanDecisionIssues", () => {
  const openGateListArgs = "list --json --tree=false --type=gate --limit 0";
  const listLabeled = "list --json --tree=false --label human --limit 0";

  test("열린 human gate와 human 라벨이 붙은 이슈만 읽는다", async () => {
    await useFakeBd({
      [openGateListArgs]: {
        stdout: JSON.stringify([
          { id: "g-1", issue_type: "gate", await_type: "human", status: "open" },
          { id: "g-2", issue_type: "gate", await_type: "timer", status: "open" },
          { id: "g-3", issue_type: "gate", await_type: "human", status: "closed" },
        ]),
      },
      [listLabeled]: {
        stdout: JSON.stringify([{ id: "q-1", status: "open", labels: ["human"] }]),
      },
    });

    const result = await humanDecisionIssues(fakeBd.workDir);

    expect(result.ok && result.value.gates.map(({ id }) => id)).toEqual(["g-1"]);
    expect(result.ok && result.value.labeled.map(({ id }) => id)).toEqual(["q-1"]);
  });

  test("조회가 하나라도 실패하면 오류를 돌려준다", async () => {
    await useFakeBd({
      [openGateListArgs]: { stdout: "[]" },
      [listLabeled]: { stderr: "boom", code: 1 },
    });

    expect(await humanDecisionIssues(fakeBd.workDir)).toEqual({
      ok: false,
      error: { message: "boom\n", exitCode: 1 },
    });
  });
});

describe("openGates", () => {
  test("human gate와 다른 종류의 gate를 함께 읽고, 닫힌 gate는 뺀다", async () => {
    await useFakeBd({
      "list --json --tree=false --type=gate --limit 0": {
        stdout: JSON.stringify([
          { id: "g-1", title: "Review", issue_type: "gate", await_type: "human", status: "open" },
          {
            id: "g-2",
            title: "Wait 72 hours",
            issue_type: "gate",
            await_type: "timer",
            status: "open",
          },
          { id: "g-3", title: "Old", issue_type: "gate", await_type: "human", status: "closed" },
        ]),
      },
    });

    const result = await openGates(fakeBd.workDir);

    expect(
      result.ok && result.value.map(({ id, title, awaitType }) => [id, title, awaitType]),
    ).toEqual([
      ["g-1", "Review", "human"],
      ["g-2", "Wait 72 hours", "timer"],
    ]);
  });
});

describe("epicDescendants", () => {
  test("epic의 하위 이슈와 그 아래 이슈를 모두 돌려주고, 다른 epic의 이슈는 뺀다", () => {
    const issues = parseIssues([
      { id: "e-1", issue_type: "epic", status: "open" },
      { id: "e-1.1", issue_type: "feature", status: "open", parent: "e-1" },
      { id: "e-1.1.1", status: "closed", parent: "e-1.1" },
      { id: "e-1.1.1.1", status: "open", parent: "e-1.1.1" },
      { id: "e-1.2", status: "open", parent: "e-1" },
      { id: "e-2", issue_type: "epic", status: "open" },
      { id: "e-2.1", status: "open", parent: "e-2" },
      { id: "loose", status: "open" },
    ]);

    expect(
      epicDescendants(issues, "e-1")
        .map((issue) => issue.id)
        .sort(),
    ).toEqual(["e-1.1", "e-1.1.1", "e-1.1.1.1", "e-1.2"]);
  });

  test("상위 관계가 순환해도 같은 이슈를 한 번만 담는다", () => {
    const issues = parseIssues([
      { id: "a", status: "open", parent: "b" },
      { id: "b", status: "open", parent: "a" },
    ]);

    expect(epicDescendants(issues, "a").map((issue) => issue.id)).toEqual(["b"]);
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

describe("openChangeFingerprint", () => {
  const doltShow = "dolt show --json";
  const hashQuery = "sql SELECT DOLT_HASHOF_DB() AS h --json";

  test("embedded mode에서는 Dolt manifest 내용을 읽는다", async () => {
    const noms = join(fakeBd.workDir, "embeddeddolt", "demo", ".dolt", "noms");
    await mkdir(noms, { recursive: true });
    await writeFile(join(noms, "manifest"), "root-1");
    await useFakeBd({
      [doltShow]: {
        stdout: JSON.stringify({
          embedded: true,
          data_dir: join(fakeBd.workDir, "embeddeddolt"),
          database: "demo",
        }),
      },
    });

    const result = await openChangeFingerprint(fakeBd.workDir);
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    const before = await result.value();
    await writeFile(join(noms, "manifest"), "root-2");

    expect([before, await result.value()]).toEqual(["root-1", "root-2"]);
  });

  test("server mode에서는 Dolt DB hash를 조회한다", async () => {
    await useFakeBd({
      [doltShow]: { stdout: JSON.stringify({ embedded: false, database: "demo" }) },
      [hashQuery]: { stdout: JSON.stringify([{ h: "hash-1" }]) },
    });

    const result = await openChangeFingerprint(fakeBd.workDir);
    if (!result.ok) throw new Error(JSON.stringify(result.error));

    expect(await result.value()).toBe("hash-1");
  });

  test("값을 읽지 못하면 null을 돌려준다", async () => {
    await useFakeBd({
      [doltShow]: { stdout: JSON.stringify({ embedded: false, database: "demo" }) },
      [hashQuery]: { stderr: "boom", code: 1 },
    });

    const result = await openChangeFingerprint(fakeBd.workDir);
    if (!result.ok) throw new Error(JSON.stringify(result.error));

    expect(await result.value()).toBeNull();
  });

  test("Dolt 설정을 읽지 못하면 오류를 돌려준다", async () => {
    await useFakeBd({ [doltShow]: { stderr: "no beads workspace", code: 1 } });

    const result = await openChangeFingerprint(fakeBd.workDir);

    expect(result).toEqual({
      ok: false,
      error: { message: "no beads workspace\n", exitCode: 1 },
    });
  });
});

describe("boardIssues", () => {
  test("상태로 열을 정하고, 열림 이슈는 bd ready와 bd blocked 결과로 나누며, 어느 열에도 맞지 않는 이슈는 뺀다", async () => {
    const issue = (id: string, status: string) => ({ id, status });
    await useFakeBd({
      [LIST_ALL_ARGS]: {
        stdout: JSON.stringify([
          issue("ready", "open"),
          issue("dep-blocked", "open"),
          issue("doing", "in_progress"),
          issue("doing-blocked", "in_progress"),
          issue("marked-blocked", "blocked"),
          issue("done", "closed"),
          issue("deferred", "deferred"),
          issue("pinned", "pinned"),
          issue("hooked", "hooked"),
          issue("custom", "review"),
          issue("open-unknown", "open"),
        ]),
      },
      [READY_ARGS]: { stdout: JSON.stringify([issue("ready", "open")]) },
      [BLOCKED_ARGS]: {
        stdout: JSON.stringify([
          issue("dep-blocked", "open"),
          issue("doing-blocked", "in_progress"),
        ]),
      },
    });

    const result = await boardIssues(fakeBd.workDir);

    expect(
      result.ok && Object.fromEntries(result.value.map(({ column, issue }) => [issue.id, column])),
    ).toEqual({
      ready: "ready",
      "dep-blocked": "blocked",
      doing: "in_progress",
      "doing-blocked": "blocked",
      "marked-blocked": "blocked",
      done: "closed",
    });
  });

  test("human 라벨이 붙은 열림·진행 중 이슈는 어느 열에도 넣지 않고, 닫혔거나 막힌 것은 그 열에 넣는다", async () => {
    const issue = (id: string, status: string) => ({ id, status, labels: ["human"] });
    await useFakeBd({
      [LIST_ALL_ARGS]: {
        stdout: JSON.stringify([
          issue("question", "open"),
          issue("asking", "in_progress"),
          issue("answered", "closed"),
          issue("marked-blocked", "blocked"),
          issue("dep-blocked", "open"),
        ]),
      },
      [READY_ARGS]: { stdout: JSON.stringify([issue("question", "open")]) },
      [BLOCKED_ARGS]: { stdout: JSON.stringify([issue("dep-blocked", "open")]) },
    });

    const result = await boardIssues(fakeBd.workDir);

    expect(
      result.ok && Object.fromEntries(result.value.map(({ column, issue }) => [issue.id, column])),
    ).toEqual({ answered: "closed", "marked-blocked": "blocked", "dep-blocked": "blocked" });
  });

  test("막힘 열의 이슈에는 bd blocked가 알려 준 막고 있는 이슈 id를 붙인다", async () => {
    await useFakeBd({
      [LIST_ALL_ARGS]: { stdout: JSON.stringify([{ id: "waiting", status: "open" }]) },
      [READY_ARGS]: { stdout: "[]" },
      [BLOCKED_ARGS]: {
        stdout: JSON.stringify([{ id: "waiting", status: "open", blocked_by: ["first"] }]),
      },
    });

    const result = await boardIssues(fakeBd.workDir);

    expect(result.ok && result.value.map(({ issue }) => issue.blockedBy)).toEqual([["first"]]);
  });

  test("보류 이슈는 bd blocked에 나와도 막힘 열을 비롯한 어느 열에도 넣지 않는다", async () => {
    await useFakeBd({
      [LIST_ALL_ARGS]: {
        stdout: JSON.stringify([
          { id: "later", status: "deferred" },
          { id: "waiting", status: "open" },
        ]),
      },
      [READY_ARGS]: { stdout: "[]" },
      [BLOCKED_ARGS]: {
        stdout: JSON.stringify([
          { id: "later", status: "deferred", blocked_by: ["first"] },
          { id: "waiting", status: "open", blocked_by: ["first"] },
        ]),
      },
    });

    const result = await boardIssues(fakeBd.workDir);

    expect(
      result.ok && Object.fromEntries(result.value.map(({ column, issue }) => [issue.id, column])),
    ).toEqual({ waiting: "blocked" });
  });

  test("decision, epic, milestone은 상태와 관계없이 어느 열에도 넣지 않는다", async () => {
    const issue = (id: string, status: string, issue_type: string) => ({ id, status, issue_type });
    await useFakeBd({
      [LIST_ALL_ARGS]: {
        stdout: JSON.stringify([
          issue("task", "open", "task"),
          issue("open-decision", "open", "decision"),
          issue("closed-decision", "closed", "decision"),
          issue("open-epic", "open", "epic"),
          issue("doing-epic", "in_progress", "epic"),
          issue("open-milestone", "open", "milestone"),
          issue("feature", "open", "feature"),
        ]),
      },
      [READY_ARGS]: {
        stdout: JSON.stringify([
          issue("task", "open", "task"),
          issue("open-decision", "open", "decision"),
          issue("open-epic", "open", "epic"),
          issue("open-milestone", "open", "milestone"),
          issue("feature", "open", "feature"),
        ]),
      },
      [BLOCKED_ARGS]: { stdout: "[]" },
    });

    const result = await boardIssues(fakeBd.workDir);

    expect(
      result.ok && Object.fromEntries(result.value.map(({ column, issue }) => [issue.id, column])),
    ).toEqual({ task: "ready", feature: "ready" });
  });

  test("막힌 decision과 epic도 막힘 열에 넣지 않는다", async () => {
    const issue = (id: string, status: string, issue_type: string) => ({ id, status, issue_type });
    await useFakeBd({
      [LIST_ALL_ARGS]: {
        stdout: JSON.stringify([
          issue("task", "open", "task"),
          issue("dep-decision", "open", "decision"),
          issue("dep-epic", "open", "epic"),
          issue("marked-epic", "blocked", "epic"),
        ]),
      },
      [READY_ARGS]: { stdout: "[]" },
      [BLOCKED_ARGS]: {
        stdout: JSON.stringify([
          { ...issue("task", "open", "task"), blocked_by: ["first"] },
          { ...issue("dep-decision", "open", "decision"), blocked_by: ["first"] },
          { ...issue("dep-epic", "open", "epic"), blocked_by: ["first"] },
        ]),
      },
    });

    const result = await boardIssues(fakeBd.workDir);

    expect(
      result.ok && Object.fromEntries(result.value.map(({ column, issue }) => [issue.id, column])),
    ).toEqual({ task: "blocked" });
  });

  test("조회가 하나라도 실패하면 열을 잘못 나누지 않도록 오류를 돌려준다", async () => {
    await useFakeBd({
      [LIST_ALL_ARGS]: { stdout: "[]" },
      [READY_ARGS]: { stdout: "[]" },
      [BLOCKED_ARGS]: { stderr: "boom", code: 1 },
    });

    const result = await boardIssues(fakeBd.workDir);

    expect(result).toEqual({ ok: false, error: { message: "boom\n", exitCode: 1 } });
  });
});

describe("staleIssues", () => {
  test("기준 일수 동안 갱신되지 않은 이슈를 개수 제한 없이 읽고, 직접 작업하지 않는 decision과 epic은 뺀다", async () => {
    await useFakeBd({
      "stale --json --days 14 --limit 0": {
        stdout: JSON.stringify([
          { id: "d-1", issue_type: "decision", status: "open" },
          { id: "e-1", issue_type: "epic", status: "open" },
          { id: "t-1", issue_type: "task", status: "in_progress" },
        ]),
      },
    });

    const result = await staleIssues(fakeBd.workDir, 14);

    expect(result.ok && result.value.map((issue) => issue.id)).toEqual(["t-1"]);
  });

  test("기준 일수가 1 이상의 정수가 아니면 bd를 실행하지 않고 거부한다", async () => {
    await useFakeBd({});

    expect(await staleIssues(fakeBd.workDir, 0)).toMatchObject({
      ok: false,
      error: { kind: "invalidStaleDays", exitCode: null },
    });
    expect(await staleIssues(fakeBd.workDir, 1.5)).toMatchObject({
      ok: false,
      error: { kind: "invalidStaleDays", exitCode: null },
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

  test("닫힌 상위 이슈를 거쳐 닿는 에픽까지 가까운 것부터 소속으로 담는다", async () => {
    await useFakeBd({
      [`${LIST_ALL_ARGS} --include-gates`]: {
        stdout: JSON.stringify([
          { id: "outer", status: "open", issue_type: "epic" },
          { id: "inner", status: "open", issue_type: "epic", parent: "outer" },
          { id: "feature", status: "closed", issue_type: "feature", parent: "inner" },
          { id: "task", status: "open", issue_type: "task", parent: "feature" },
          { id: "alone", status: "open", issue_type: "task" },
        ]),
      },
      ...signals,
    });

    const result = await dependencyGraph(fakeBd.workDir);

    expect(result.ok && result.value.ancestorEpics).toEqual({
      inner: ["outer"],
      feature: ["inner", "outer"],
      task: ["inner", "outer"],
    });
  });

  test("상위 관계가 순환해도 소속을 정하다 멈춘다", async () => {
    await useFakeBd({
      [`${LIST_ALL_ARGS} --include-gates`]: {
        stdout: JSON.stringify([
          { id: "x", status: "open", issue_type: "epic", parent: "y" },
          { id: "y", status: "open", issue_type: "epic", parent: "x" },
        ]),
      },
      ...signals,
    });

    const result = await dependencyGraph(fakeBd.workDir);

    expect(result.ok && result.value.ancestorEpics).toEqual({ x: ["y"], y: ["x"] });
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

describe("orphanIssues", () => {
  test("커밋 메시지에 언급됐지만 열린 이슈와 마지막 커밋을 읽는다", async () => {
    await useFakeBd({
      "orphans --json": {
        stdout: JSON.stringify([
          {
            issue_id: "t-pfw",
            title: "고아",
            status: "open",
            latest_commit: "8520f14",
            latest_commit_message: "fix: something (t-pfw)",
          },
        ]),
      },
    });

    const result = await orphanIssues(fakeBd.workDir);

    expect(result).toEqual({
      ok: true,
      value: [
        {
          id: "t-pfw",
          title: "고아",
          status: "open",
          latestCommit: "8520f14",
          latestCommitMessage: "fix: something (t-pfw)",
        },
      ],
    });
  });

  test("결과가 없을 때 bd가 출력하는 null은 빈 목록으로 읽는다", async () => {
    await useFakeBd({ "orphans --json": { stdout: "null\n" } });

    expect(await orphanIssues(fakeBd.workDir)).toEqual({ ok: true, value: [] });
  });
});

describe("lintFindings", () => {
  test("필수 섹션이 빠진 이슈와 빠진 섹션을 읽는다", async () => {
    await useFakeBd({
      "lint --json": {
        stdout: JSON.stringify({
          total: 2,
          issues: 1,
          results: [
            {
              id: "t-ocm",
              title: "로그인 링크 오류",
              type: "bug",
              missing: ["## Steps to Reproduce", "## Acceptance Criteria"],
              warnings: 2,
            },
          ],
        }),
      },
    });

    const result = await lintFindings(fakeBd.workDir);

    expect(result).toEqual({
      ok: true,
      value: [
        {
          id: "t-ocm",
          title: "로그인 링크 오류",
          issueType: "bug",
          missing: ["## Steps to Reproduce", "## Acceptance Criteria"],
        },
      ],
    });
  });

  test("결과가 없을 때 bd가 출력하는 results null은 빈 목록으로 읽는다", async () => {
    await useFakeBd({
      "lint --json": { stdout: JSON.stringify({ total: 0, issues: 0, results: null }) },
    });

    expect(await lintFindings(fakeBd.workDir)).toEqual({ ok: true, value: [] });
  });
});

describe("duplicateCandidates", () => {
  test("API key가 필요 없는 mechanical 방식으로 닫히지 않은 중복 후보 쌍을 개수 제한 없이 읽는다", async () => {
    await useFakeBd({
      "find-duplicates --json --method mechanical --limit 0": {
        stdout: JSON.stringify({
          count: 1,
          method: "mechanical",
          pairs: [
            {
              issue_a_id: "t-7xh",
              issue_a_title: "로그인 링크 오류",
              issue_b_id: "t-ocm",
              issue_b_title: "로그인 링크 오류 수정",
              method: "mechanical",
              similarity: 0.8,
            },
          ],
          schema_version: 1,
          threshold: 0.5,
        }),
      },
    });

    const result = await duplicateCandidates(fakeBd.workDir);

    expect(result).toEqual({
      ok: true,
      value: [
        [
          { id: "t-7xh", title: "로그인 링크 오류" },
          { id: "t-ocm", title: "로그인 링크 오류 수정" },
        ],
      ],
    });
  });
});
