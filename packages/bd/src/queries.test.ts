import { chmod, mkdir, mkdtemp, readFile, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  boardIssues,
  decisionRecords,
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
        result.value.map((status) => [status.epic.id, status.totalChildren, status.closedChildren]),
    ).toEqual([
      ["e-1", 2, 1],
      ["e-2", 1, 1],
      ["e-3", 0, 0],
      ["e-4", 0, 0],
    ]);
  });

  test("bd가 실패하면 오류를 돌려준다", async () => {
    await useFakeBd({ [listAll]: { stderr: "boom", code: 1 } });

    const result = await epicStatuses(workDir);

    expect(result).toEqual({ ok: false, error: { message: "boom\n", exitCode: 1 } });
  });
});

describe("decisionRecords", () => {
  const listDecisions = "list --json --tree=false --all --limit 0 --type=decision";

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

    const result = await decisionRecords(workDir);

    expect(
      result.ok && result.value.map((record) => [record.decision.id, record.supersededBy]),
    ).toEqual([
      ["d-2", null],
      ["d-1", "d-2"],
    ]);
  });

  test("bd가 실패하면 오류를 돌려준다", async () => {
    await useFakeBd({ [listDecisions]: { stderr: "boom", code: 1 } });

    const result = await decisionRecords(workDir);

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
    all: "list --json --tree=false --all --limit 0",
    ready: "ready --limit 0 --json",
    blocked: "blocked --json",
  };

  test("상태로 열을 정하고, 열림 이슈는 bd ready와 bd blocked 결과로 나눈다", async () => {
    const issue = (id: string, status: string) => ({ id, status });
    await useFakeBd({
      [boardArgs.all]: {
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
      [boardArgs.ready]: { stdout: JSON.stringify([issue("ready", "open")]) },
      [boardArgs.blocked]: {
        stdout: JSON.stringify([
          issue("dep-blocked", "open"),
          issue("doing-blocked", "in_progress"),
        ]),
      },
    });

    const result = await boardIssues(workDir);

    expect(
      result.ok && Object.fromEntries(result.value.map(({ column, issue }) => [issue.id, column])),
    ).toEqual({
      ready: "ready",
      "dep-blocked": "blocked",
      doing: "in_progress",
      "doing-blocked": "blocked",
      "marked-blocked": "blocked",
      done: "closed",
      deferred: "other",
      pinned: "other",
      hooked: "other",
      custom: "other",
      "open-unknown": "other",
    });
  });

  test("조회가 하나라도 실패하면 열을 잘못 나누지 않도록 오류를 돌려준다", async () => {
    await useFakeBd({
      [boardArgs.all]: { stdout: "[]" },
      [boardArgs.ready]: { stdout: "[]" },
      [boardArgs.blocked]: { stderr: "boom", code: 1 },
    });

    const result = await boardIssues(workDir);

    expect(result).toEqual({ ok: false, error: { message: "boom\n", exitCode: 1 } });
  });
});
