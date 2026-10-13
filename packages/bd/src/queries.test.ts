import { chmod, mkdtemp, readFile, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { boardIssues, epicChildren, epicStatuses, listIssues, readyIssues } from "./queries";

type FakeResponse = { stdout?: string; stderr?: string; code?: number };

let workDir: string;
const originalBdBin = process.env.BD_BIN;

beforeEach(async () => {
  workDir = await realpath(await mkdtemp(join(tmpdir(), "beads-desk-queries-")));
});

afterEach(() => {
  process.env.BD_BIN = originalBdBin;
});

async function fixture(name: string): Promise<string> {
  return readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
}

/**
 * `--sandbox` 뒤의 인자 문자열이 정확히 일치할 때만 응답하는 가짜 bd를 지정합니다.
 * 일치하는 응답이 없으면 종료 코드 99로 실패합니다.
 */
async function useFakeBd(responses: Record<string, FakeResponse>): Promise<void> {
  const cases = await Promise.all(
    Object.entries(responses).map(async ([args, response], index) => {
      const stdoutFile = join(workDir, `stdout-${index}`);
      await writeFile(stdoutFile, response.stdout ?? "");
      const stderr = response.stderr ? `echo "${response.stderr}" >&2; ` : "";
      return `  "--sandbox ${args}") cat "${stdoutFile}"; ${stderr}exit ${response.code ?? 0};;`;
    }),
  );
  const fakeBd = join(workDir, "fake-bd");
  await writeFile(
    fakeBd,
    `#!/bin/sh\ncase "$*" in\n${cases.join("\n")}\n  *) echo "unexpected: $*" >&2; exit 99;;\nesac\n`,
  );
  await chmod(fakeBd, 0o755);
  process.env.BD_BIN = fakeBd;
}

describe("listIssues", () => {
  test("지정한 상태의 이슈를 최대 1000개까지 조회한다", async () => {
    await useFakeBd({
      "list --json --tree=false --status open,in_progress --limit 1000": {
        stdout: await fixture("list.json"),
      },
    });

    const result = await listIssues(workDir, ["open", "in_progress"]);

    expect(result.ok && result.value.map((issue) => issue.id)).toEqual([
      "demo-x2e",
      "demo-8g0",
      "demo-cy2",
      "demo-8g0.1",
    ]);
  });

  test("상태를 지정하지 않으면 모든 저장 상태의 이슈를 조회한다", async () => {
    await useFakeBd({
      "list --json --tree=false --status open,in_progress,blocked,deferred,closed --limit 1000": {
        stdout: "[]",
      },
    });

    const result = await listIssues(workDir, []);

    expect(result).toEqual({ ok: true, value: [] });
  });

  test("bd가 실패하면 stderr와 종료 코드를 담은 오류를 돌려준다", async () => {
    await useFakeBd({
      "list --json --tree=false --status open --limit 1000": { stderr: "boom", code: 2 },
    });

    const result = await listIssues(workDir, ["open"]);

    expect(result).toEqual({ ok: false, error: { message: "boom\n", exitCode: 2 } });
  });

  test("bd가 stderr 없이 실패하면 종료 코드를 담은 메시지를 돌려준다", async () => {
    await useFakeBd({
      "list --json --tree=false --status open --limit 1000": { code: 2 },
    });

    const result = await listIssues(workDir, ["open"]);

    expect(result).toEqual({
      ok: false,
      error: { message: "bd가 종료 코드 2로 실패했습니다.", exitCode: 2 },
    });
  });

  test("bd 출력이 JSON이 아니면 오류를 돌려준다", async () => {
    await useFakeBd({
      "list --json --tree=false --status open --limit 1000": { stdout: "not json" },
    });

    const result = await listIssues(workDir, ["open"]);

    expect(result).toEqual({
      ok: false,
      error: { message: "bd 출력을 JSON으로 해석하지 못했습니다.", exitCode: 0 },
    });
  });
});

describe("readyIssues", () => {
  test("바로 작업할 수 있는 이슈를 최대 1000개까지 조회한다", async () => {
    await useFakeBd({
      "ready --limit 1000 --json": { stdout: await fixture("ready.json") },
    });

    const result = await readyIssues(workDir);

    expect(result.ok && result.value.map((issue) => issue.id)).toEqual(["demo-8g0"]);
  });
});

describe("epicStatuses", () => {
  test("epic과 하위 이슈 집계를 돌려준다", async () => {
    await useFakeBd({ "epic status --json": { stdout: await fixture("epic-status.json") } });

    const result = await epicStatuses(workDir);

    expect(result.ok && result.value).toEqual([
      {
        epic: expect.objectContaining({ id: "demo-8g0", issueType: "epic" }),
        totalChildren: 1,
        closedChildren: 0,
        eligibleForClose: false,
      },
    ]);
  });

  test("tombstone 상태이거나 삭제된 epic은 제외한다", async () => {
    await useFakeBd({
      "epic status --json": {
        stdout: JSON.stringify([
          { epic: { id: "e-1", status: "tombstone" }, total_children: 0 },
          { epic: { id: "e-2", status: "open", deleted_at: "2026-10-13T00:00:00Z" } },
          { epic: { id: "e-3", status: "open" }, total_children: 2, closed_children: 1 },
        ]),
      },
    });

    const result = await epicStatuses(workDir);

    expect(result.ok && result.value.map((status) => status.epic.id)).toEqual(["e-3"]);
  });
});

describe("epicChildren", () => {
  test("epic의 하위 이슈를 조회한다", async () => {
    await useFakeBd({ "children demo-8g0 --json": { stdout: await fixture("children.json") } });

    const result = await epicChildren(workDir, "demo-8g0");

    expect(result.ok && result.value.map((issue) => issue.id)).toEqual(["demo-8g0.1"]);
  });

  test("epic id가 비어 있으면 bd를 실행하지 않고 오류를 돌려준다", async () => {
    await useFakeBd({});

    const result = await epicChildren(workDir, "  ");

    expect(result).toEqual({
      ok: false,
      error: { message: "epic id가 비어 있습니다.", exitCode: null },
    });
  });
});

describe("boardIssues", () => {
  const boardArgs = {
    ready: "ready --limit 1000 --json",
    blocked: "blocked --json",
    inProgress: "list --json --tree=false --status in_progress --limit 1000",
    closed: "list --json --tree=false --status closed --limit 1000",
  };

  test("한 이슈가 여러 열에 걸리면 blocked, in_progress, ready, closed 순으로 우선한다", async () => {
    const issue = (id: string) => ({ id, status: "open" });
    await useFakeBd({
      [boardArgs.ready]: { stdout: JSON.stringify([issue("a"), issue("b"), issue("c")]) },
      [boardArgs.blocked]: { stdout: JSON.stringify([issue("a")]) },
      [boardArgs.inProgress]: { stdout: JSON.stringify([issue("b")]) },
      [boardArgs.closed]: { stdout: JSON.stringify([issue("c"), issue("d")]) },
    });

    const result = await boardIssues(workDir);

    expect(result.ok && result.value.map(({ column, issue }) => [issue.id, column]).sort()).toEqual(
      [
        ["a", "blocked"],
        ["b", "in_progress"],
        ["c", "ready"],
        ["d", "closed"],
      ],
    );
  });

  test("일부 열 조회가 실패해도 나머지 열은 돌려준다", async () => {
    await useFakeBd({
      [boardArgs.ready]: { stdout: JSON.stringify([{ id: "a" }]) },
      [boardArgs.blocked]: { stderr: "boom", code: 1 },
      [boardArgs.inProgress]: { stdout: "[]" },
      [boardArgs.closed]: { stdout: "[]" },
    });

    const result = await boardIssues(workDir);

    expect(result.ok && result.value.map(({ issue }) => issue.id)).toEqual(["a"]);
  });

  test("모든 열 조회가 실패하면 오류를 돌려준다", async () => {
    await useFakeBd({});

    const result = await boardIssues(workDir);

    expect(result.ok).toBe(false);
  });
});
