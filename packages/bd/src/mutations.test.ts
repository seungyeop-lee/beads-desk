import { chmod, mkdtemp, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  addComment,
  addDependency,
  addLabel,
  claimIssue,
  closeAsReplaced,
  closeIssue,
  createIssue,
  deferIssue,
  deleteIssue,
  dismissHuman,
  removeDependency,
  removeLabel,
  respondToHuman,
  setIssueStatus,
  updateIssueFields,
} from "./mutations";

type FakeResponse = { stdout?: string; stderr?: string; code?: number };

let workDir: string;
const originalBdBin = process.env.BD_BIN;

beforeEach(async () => {
  workDir = await realpath(await mkdtemp(join(tmpdir(), "beads-desk-mutations-")));
});

afterEach(() => {
  process.env.BD_BIN = originalBdBin;
});

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

const succeeded = { ok: true, value: null };

describe("createIssue", () => {
  test("입력한 값으로 이슈를 만들고 새 id를 돌려준다", async () => {
    await useFakeBd({
      "create --json --title=-Dash title --type=bug --priority=1 --description=Body --labels=ui,api --parent=demo-epic":
        { stdout: '{"id":"demo-new","title":"-Dash title"}' },
    });

    const result = await createIssue(workDir, {
      title: " -Dash title ",
      issueType: "bug",
      priority: 1,
      description: "Body",
      labels: ["ui", "api"],
      parent: "demo-epic",
    });

    expect(result).toEqual({ ok: true, value: "demo-new" });
  });

  test("고르지 않은 값은 bd 기본값을 쓰도록 넘기지 않는다", async () => {
    await useFakeBd({ "create --json --title=Plain": { stdout: '{"id":"demo-new"}' } });

    const result = await createIssue(workDir, { title: "Plain", description: "", labels: [] });

    expect(result).toEqual({ ok: true, value: "demo-new" });
  });

  test("제목이 비어 있으면 bd를 실행하지 않는다", async () => {
    await useFakeBd({});

    const result = await createIssue(workDir, { title: "  " });

    expect(result).toEqual({
      ok: false,
      error: { message: "제목이 비어 있습니다.", exitCode: null },
    });
  });
});

describe("updateIssueFields", () => {
  test("바꾼 필드만 플래그로 넘기고 id는 플래그 뒤에 둔다", async () => {
    await useFakeBd({
      "update --title=New --acceptance=-Done when --notes= --priority=0 --assignee= -- demo-1": {},
    });

    const result = await updateIssueFields(workDir, "demo-1", {
      title: "New",
      acceptanceCriteria: "-Done when",
      notes: "",
      priority: 0,
      assignee: "",
    });

    expect(result).toEqual(succeeded);
  });

  test("본문 필드는 각각의 플래그로 넘긴다", async () => {
    await useFakeBd({ "update --description=D --design=E -- demo-1": {} });

    const result = await updateIssueFields(workDir, "demo-1", { description: "D", design: "E" });

    expect(result).toEqual(succeeded);
  });

  test("제목을 비우거나 바꿀 필드가 없으면 bd를 실행하지 않는다", async () => {
    await useFakeBd({});

    expect(await updateIssueFields(workDir, "demo-1", { title: " " })).toEqual({
      ok: false,
      error: { message: "제목이 비어 있습니다.", exitCode: null },
    });
    expect(await updateIssueFields(workDir, "demo-1", {})).toEqual({
      ok: false,
      error: { message: "바꿀 내용이 없습니다.", exitCode: null },
    });
  });

  test("bd가 실패하면 stderr를 오류로 돌려준다", async () => {
    await useFakeBd({ "update --title=New -- demo-zzz": { stderr: "no issue found", code: 1 } });

    const result = await updateIssueFields(workDir, "demo-zzz", { title: "New" });

    expect(result).toEqual({ ok: false, error: { message: "no issue found\n", exitCode: 1 } });
  });
});

describe("setIssueStatus", () => {
  test("보류가 아닌 상태로 바꾸면 보류 기한을 함께 지운다", async () => {
    await useFakeBd({ "update --status=in_progress --defer= -- demo-1": {} });

    expect(await setIssueStatus(workDir, "demo-1", "in_progress")).toEqual(succeeded);
  });

  test("보류로 바꾸면 보류 기한을 그대로 둔다", async () => {
    await useFakeBd({ "update --status=deferred -- demo-1": {} });

    expect(await setIssueStatus(workDir, "demo-1", "deferred")).toEqual(succeeded);
  });
});

describe("deferIssue", () => {
  test("정해 둔 기한을 bd 기간 표기로 넘기고 사유를 메모에 덧붙인다", async () => {
    await useFakeBd({
      "update --status=deferred --defer=+1d --append-notes=API 열림 대기 -- demo-1": {},
      "update --status=deferred --defer=+7d -- demo-2": {},
    });

    expect(
      await deferIssue(workDir, "demo-1", { until: "tomorrow", reason: " API 열림 대기 " }),
    ).toEqual(succeeded);
    expect(await deferIssue(workDir, "demo-2", { until: "week", reason: " " })).toEqual(succeeded);
  });

  test("무기한이면 이미 정해 둔 기한도 지운다", async () => {
    await useFakeBd({ "update --status=deferred --defer= -- demo-1": {} });

    expect(await deferIssue(workDir, "demo-1", { until: "indefinite", reason: "" })).toEqual(
      succeeded,
    );
  });

  test("지정한 날짜는 그대로 넘긴다", async () => {
    await useFakeBd({ "update --status=deferred --defer=2026-12-01 -- demo-1": {} });

    expect(
      await deferIssue(workDir, "demo-1", { until: { date: "2026-12-01" }, reason: "" }),
    ).toEqual(succeeded);
  });

  test("날짜 자리에 YYYY-MM-DD가 아닌 표기가 오면 bd를 실행하지 않고 거부한다", async () => {
    await useFakeBd({});

    const result = await deferIssue(workDir, "demo-1", { until: { date: "+1m" }, reason: "" });

    expect(result).toMatchObject({ ok: false });
  });
});

describe("claimIssue", () => {
  test("담당자 지정과 진행 중 전환을 claim 한 번으로 한다", async () => {
    await useFakeBd({ "update --claim -- demo-1": {} });

    expect(await claimIssue(workDir, "demo-1")).toEqual(succeeded);
  });

  test("이미 다른 사람에게 지정된 이슈라 bd가 거부하면 첫 줄의 거부 사유만 돌려준다", async () => {
    await useFakeBd({
      "update --claim -- demo-1": {
        stderr:
          "Error updating demo-1: issue already claimed by other\nError: 1 of 1 issues failed to update\n  demo-1: updating issue: issue already claimed by other",
        code: 1,
      },
    });

    expect(await claimIssue(workDir, "demo-1")).toEqual({
      ok: false,
      error: { message: "Error updating demo-1: issue already claimed by other", exitCode: 1 },
    });
  });
});

describe("closeIssue", () => {
  test("사유와 함께 닫고, 그 때문에 막힘이 풀린 이슈를 돌려준다", async () => {
    await useFakeBd({
      "close --json --suggest-next --reason=-끝냄 -- demo-1": {
        stdout: JSON.stringify({
          closed: [{ id: "demo-1", title: "선행", status: "closed" }],
          unblocked: [{ id: "demo-2", title: "후행", status: "open" }],
        }),
      },
    });

    const result = await closeIssue(workDir, "demo-1", { reason: "-끝냄" });

    expect(result.ok && result.value.map(({ id, title }) => ({ id, title }))).toEqual([
      { id: "demo-2", title: "후행" },
    ]);
  });

  test("막힘이 풀린 이슈가 없으면 bd가 닫은 이슈 배열만 출력하므로 빈 목록을 돌려준다", async () => {
    await useFakeBd({
      "close --json --suggest-next -- demo-1": { stdout: '[{"id":"demo-1","status":"closed"}]' },
    });

    expect(await closeIssue(workDir, "demo-1", { reason: "  " })).toEqual({ ok: true, value: [] });
  });

  test("열린 하위 이슈나 선행 이슈 때문에 닫지 못하면 그 사실을 알린다", async () => {
    await useFakeBd({
      "close --json --suggest-next -- demo-1": {
        stderr: "cannot close demo-1: 1 open child issue(s)",
        code: 1,
      },
    });

    const result = await closeIssue(workDir, "demo-1", { reason: "" });

    expect(result).toEqual({
      ok: false,
      closeBlocked: true,
      error: { message: "cannot close demo-1: 1 open child issue(s)\n", exitCode: 1 },
    });
  });

  test("force를 주면 막는 이슈가 있어도 닫는다", async () => {
    await useFakeBd({
      "close --json --suggest-next --force --reason=강제 -- demo-1": { stdout: "[]" },
    });

    expect(await closeIssue(workDir, "demo-1", { reason: "강제", force: true })).toEqual({
      ok: true,
      value: [],
    });
  });
});

describe("closeAsReplaced", () => {
  test("대상 이슈로 대체하거나 대상 이슈의 중복으로 표시해 닫는다", async () => {
    await useFakeBd({
      "supersede --with=demo-2 -- demo-1": {},
      "duplicate --of=demo-3 -- demo-1": {},
    });

    expect(await closeAsReplaced(workDir, "demo-1", "supersede", " demo-2 ")).toEqual(succeeded);
    expect(await closeAsReplaced(workDir, "demo-1", "duplicate", "demo-3")).toEqual(succeeded);
  });

  test("bd가 거부하면 오류 뒤에 붙는 명령 도움말을 빼고 오류만 돌려준다", async () => {
    await useFakeBd({
      "supersede --with=demo-1 -- demo-1": {
        stderr:
          "Error: cannot mark an issue as superseded by itself\nUsage:\n  bd supersede <id> --with <new> [flags]",
        code: 1,
      },
    });

    expect(await closeAsReplaced(workDir, "demo-1", "supersede", "demo-1")).toEqual({
      ok: false,
      error: { message: "Error: cannot mark an issue as superseded by itself", exitCode: 1 },
    });
  });

  test("대상 이슈 id가 비어 있으면 bd를 실행하지 않는다", async () => {
    await useFakeBd({});

    expect(await closeAsReplaced(workDir, "demo-1", "duplicate", " ")).toEqual({
      ok: false,
      error: { message: "대상 이슈 id가 비어 있습니다.", exitCode: null },
    });
  });
});

describe("댓글, 라벨, 의존 관계, 삭제", () => {
  test("값이 -로 시작해도 플래그로 해석되지 않게 -- 뒤에 넘긴다", async () => {
    await useFakeBd({
      "comments add -- demo-1 - bullet": {},
      "label add -- demo-1 -ui": {},
      "label remove -- demo-1 ui": {},
      "dep add --type=parent-child -- demo-1 demo-2": {},
      "dep remove -- demo-1 demo-2": {},
      "delete --force -- demo-1": {},
    });

    expect(await addComment(workDir, "demo-1", "- bullet")).toEqual(succeeded);
    expect(await addLabel(workDir, "demo-1", " -ui ")).toEqual(succeeded);
    expect(await removeLabel(workDir, "demo-1", "ui")).toEqual(succeeded);
    expect(await addDependency(workDir, "demo-1", "demo-2", "parent-child")).toEqual(succeeded);
    expect(await removeDependency(workDir, "demo-1", "demo-2")).toEqual(succeeded);
    expect(await deleteIssue(workDir, "demo-1")).toEqual(succeeded);
  });

  test("빈 댓글, 빈 라벨, 빈 id는 bd를 실행하지 않는다", async () => {
    await useFakeBd({});

    expect(await addComment(workDir, "demo-1", " \n")).toEqual({
      ok: false,
      error: { message: "댓글이 비어 있습니다.", exitCode: null },
    });
    expect(await addLabel(workDir, "demo-1", " ")).toEqual({
      ok: false,
      error: { message: "라벨이 비어 있습니다.", exitCode: null },
    });
    expect(await addDependency(workDir, "demo-1", "", "blocks")).toEqual({
      ok: false,
      error: { message: "이슈 id가 비어 있습니다.", exitCode: null },
    });
    expect(await deleteIssue(workDir, "")).toEqual({
      ok: false,
      error: { message: "이슈 id가 비어 있습니다.", exitCode: null },
    });
  });
});

describe("respondToHuman, dismissHuman", () => {
  const showArgs = (id: string) => `show --json --include-comments --include-dependents -- ${id}`;
  const shown = (id: string, status: string, labels: string[]) => ({
    stdout: JSON.stringify([{ id, status, labels }]),
  });

  test("판단을 기다리는 이슈면 bd human respond와 dismiss를 실행한다", async () => {
    await useFakeBd({
      [showArgs("demo-1")]: shown("demo-1", "open", ["human"]),
      "human respond -- demo-1 Use OAuth2": {},
      "human dismiss -- demo-1 No longer applicable": {},
      "human dismiss -- demo-1": {},
    });

    expect(await respondToHuman(workDir, "demo-1", "Use OAuth2")).toEqual(succeeded);
    expect(await dismissHuman(workDir, "demo-1", " No longer applicable ")).toEqual(succeeded);
    expect(await dismissHuman(workDir, "demo-1", " ")).toEqual(succeeded);
  });

  test("human 라벨이 없거나 닫힌 이슈에는 bd human 명령을 실행하지 않는다", async () => {
    await useFakeBd({
      [showArgs("demo-2")]: shown("demo-2", "open", []),
      [showArgs("demo-3")]: shown("demo-3", "closed", ["human"]),
    });
    const rejected = {
      ok: false,
      error: { message: "사람 판단을 기다리는 이슈가 아닙니다.", exitCode: null },
    };

    expect(await respondToHuman(workDir, "demo-2", "Use OAuth2")).toEqual(rejected);
    expect(await dismissHuman(workDir, "demo-3", "")).toEqual(rejected);
  });

  test("빈 응답은 bd를 실행하지 않는다", async () => {
    await useFakeBd({});

    expect(await respondToHuman(workDir, "demo-1", " \n")).toEqual({
      ok: false,
      error: { message: "응답이 비어 있습니다.", exitCode: null },
    });
  });
});
