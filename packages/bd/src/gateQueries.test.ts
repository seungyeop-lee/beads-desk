import { describe, expect, test } from "vitest";
import { fakeBdWorkspace } from "./fakeBd.testkit";
import { humanDecisionIssues, humanGates, openGates, previousGateRounds } from "./gateQueries";

const fakeBd = fakeBdWorkspace("beads-desk-gate-queries-");
const { useFakeBd } = fakeBd;

// 가짜 bd는 `--sandbox` 뒤의 인자 전체를 하나의 문자열로 비교하므로, 여러 describe가 쓰는 인자 문자열을 상수로 묶습니다.
const LIST_GATES_ARGS = "list --json --tree=false --type=gate --all --limit 0";
const LIST_OPEN_ARGS = "list --json --tree=false --limit 0";

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
