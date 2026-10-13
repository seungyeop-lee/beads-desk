import { chmod, mkdir, mkdtemp, readFile, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  boardIssues,
  epicChildren,
  epicStatuses,
  listIssues,
  openChangeFingerprint,
  readyIssues,
  showIssue,
} from "./queries";

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
  test("지정한 상태의 이슈를 개수 제한 없이 조회한다", async () => {
    await useFakeBd({
      "list --json --tree=false --status open,in_progress --limit 0": {
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

  test("상태를 지정하지 않으면 pinned, hooked, 사용자 정의 상태까지 모든 이슈를 조회한다", async () => {
    await useFakeBd({
      "list --json --tree=false --all --limit 0": {
        stdout: "[]",
      },
    });

    const result = await listIssues(workDir, []);

    expect(result).toEqual({ ok: true, value: [] });
  });

  test("bd가 실패하면 stderr와 종료 코드를 담은 오류를 돌려준다", async () => {
    await useFakeBd({
      "list --json --tree=false --status open --limit 0": { stderr: "boom", code: 2 },
    });

    const result = await listIssues(workDir, ["open"]);

    expect(result).toEqual({ ok: false, error: { message: "boom\n", exitCode: 2 } });
  });

  test("bd가 stderr 없이 실패하면 종료 코드를 담은 메시지를 돌려준다", async () => {
    await useFakeBd({
      "list --json --tree=false --status open --limit 0": { code: 2 },
    });

    const result = await listIssues(workDir, ["open"]);

    expect(result).toEqual({
      ok: false,
      error: { message: "bd가 종료 코드 2로 실패했습니다.", exitCode: 2 },
    });
  });

  test("bd 출력이 JSON이 아니면 오류를 돌려준다", async () => {
    await useFakeBd({
      "list --json --tree=false --status open --limit 0": { stdout: "not json" },
    });

    const result = await listIssues(workDir, ["open"]);

    expect(result).toEqual({
      ok: false,
      error: { message: "bd 출력을 JSON으로 해석하지 못했습니다.", exitCode: 0 },
    });
  });
});

describe("readyIssues", () => {
  test("바로 작업할 수 있는 이슈를 개수 제한 없이 조회한다", async () => {
    await useFakeBd({
      "ready --limit 0 --json": { stdout: await fixture("ready.json") },
    });

    const result = await readyIssues(workDir);

    expect(result.ok && result.value.map((issue) => issue.id)).toEqual(["demo-8g0"]);
  });
});

describe("epicStatuses", () => {
  const listAll = "list --json --tree=false --all --limit 0";

  test("모든 이슈를 한 번에 읽어 epic마다 직접 하위 이슈와 닫힌 하위 이슈를 센다", async () => {
    await useFakeBd({
      [listAll]: {
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

    const result = await epicStatuses(workDir);

    expect(
      result.ok &&
        result.value.map((status) => [
          status.epic.id,
          status.totalChildren,
          status.closedChildren,
          status.eligibleForClose,
        ]),
    ).toEqual([
      ["e-1", 2, 1, false],
      ["e-2", 1, 1, true],
      ["e-3", 0, 0, false],
      ["e-4", 0, 0, false],
    ]);
  });

  test("bd가 실패하면 오류를 돌려준다", async () => {
    await useFakeBd({ [listAll]: { stderr: "boom", code: 1 } });

    const result = await epicStatuses(workDir);

    expect(result).toEqual({ ok: false, error: { message: "boom\n", exitCode: 1 } });
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

describe("showIssue", () => {
  test("댓글과 이 이슈에 의존하는 이슈까지 담아 조회한다", async () => {
    await useFakeBd({
      "show --json --include-comments --include-dependents -- demo-865.1": {
        stdout: await fixture("show.json"),
      },
    });

    const result = await showIssue(workDir, "demo-865.1");

    expect(result.ok && result.value.comments.length).toBe(1);
    expect(result.ok && result.value.dependents.length).toBe(1);
  });

  test("id가 비어 있으면 bd를 실행하지 않고 오류를 돌려준다", async () => {
    await useFakeBd({});

    const result = await showIssue(workDir, " ");

    expect(result).toEqual({
      ok: false,
      error: { message: "이슈 id가 비어 있습니다.", exitCode: null },
    });
  });

  test("bd가 실패하면 오류를 돌려준다", async () => {
    await useFakeBd({
      "show --json --include-comments --include-dependents -- demo-zzz": {
        stderr: "Issue demo-zzz not found",
        code: 1,
      },
    });

    const result = await showIssue(workDir, "demo-zzz");

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
    const noms = join(workDir, "embeddeddolt", "demo", ".dolt", "noms");
    await mkdir(noms, { recursive: true });
    await writeFile(join(noms, "manifest"), "root-1");
    await useFakeBd({
      [doltShow]: {
        stdout: JSON.stringify({
          embedded: true,
          data_dir: join(workDir, "embeddeddolt"),
          database: "demo",
        }),
      },
    });

    const result = await openChangeFingerprint(workDir);
    if (!result.ok) throw new Error(result.error.message);
    const before = await result.value();
    await writeFile(join(noms, "manifest"), "root-2");

    expect([before, await result.value()]).toEqual(["root-1", "root-2"]);
  });

  test("server mode에서는 Dolt DB hash를 조회한다", async () => {
    await useFakeBd({
      [doltShow]: { stdout: JSON.stringify({ embedded: false, database: "demo" }) },
      [hashQuery]: { stdout: JSON.stringify([{ h: "hash-1" }]) },
    });

    const result = await openChangeFingerprint(workDir);
    if (!result.ok) throw new Error(result.error.message);

    expect(await result.value()).toBe("hash-1");
  });

  test("값을 읽지 못하면 null을 돌려준다", async () => {
    await useFakeBd({
      [doltShow]: { stdout: JSON.stringify({ embedded: false, database: "demo" }) },
      [hashQuery]: { stderr: "boom", code: 1 },
    });

    const result = await openChangeFingerprint(workDir);
    if (!result.ok) throw new Error(result.error.message);

    expect(await result.value()).toBeNull();
  });

  test("Dolt 설정을 읽지 못하면 오류를 돌려준다", async () => {
    await useFakeBd({ [doltShow]: { stderr: "no beads workspace", code: 1 } });

    const result = await openChangeFingerprint(workDir);

    expect(result).toEqual({
      ok: false,
      error: { message: "no beads workspace\n", exitCode: 1 },
    });
  });
});

describe("boardIssues", () => {
  const boardArgs = {
    ready: "ready --limit 0 --json",
    blocked: "blocked --json",
    inProgress: "list --json --tree=false --status in_progress --limit 0",
    closed: "list --json --tree=false --status closed --limit 0",
    blockedStatus: "list --json --tree=false --status blocked --limit 0",
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

  test("의존 관계 때문에 막힌 이슈와 함께, 상태를 blocked로 둔 이슈도 blocked 열에 넣는다", async () => {
    await useFakeBd({
      [boardArgs.ready]: { stdout: "[]" },
      [boardArgs.blocked]: { stdout: JSON.stringify([{ id: "a", status: "open" }]) },
      [boardArgs.inProgress]: { stdout: "[]" },
      [boardArgs.closed]: { stdout: "[]" },
      [boardArgs.blockedStatus]: { stdout: JSON.stringify([{ id: "b", status: "blocked" }]) },
    });

    const result = await boardIssues(workDir);

    expect(result.ok && result.value.map(({ column, issue }) => [issue.id, column]).sort()).toEqual(
      [
        ["a", "blocked"],
        ["b", "blocked"],
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
