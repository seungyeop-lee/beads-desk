import { rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { beforeEach, expect, test } from "vitest";
import { fakeBdWorkspace } from "@/server/infra/fakeBd.testkit";
import { readIssueExport } from "./issueExportCache";

const fakeBd = fakeBdWorkspace("beads-desk-export-");
let hashFile: string;
let exportFile: string;

beforeEach(async () => {
  hashFile = join(fakeBd.workDir, "hash");
  exportFile = join(fakeBd.workDir, "export.jsonl");
  await replace(hashFile, "hash-1");
  await replace(exportFile, exportLine("첫 댓글"));
  // server mode workspace처럼 응답하고, DB hash와 export 출력은 파일 내용으로 돌려주는 가짜 bd입니다.
  // 인자 문자열 전체가 같을 때만 export에 응답하므로, 다른 옵션을 붙여 실행하면 실패합니다.
  await fakeBd.useFakeBdScript(
    [
      'case "$*" in',
      `  "--sandbox dolt show --json") echo '{"embedded":false,"database":"demo"}';;`,
      `  "--sandbox sql SELECT DOLT_HASHOF_DB() AS h --json") [ -e "${hashFile}" ] || exit 1; printf '[{"h":"%s"}]' "$(cat "${hashFile}")";;`,
      `  "--sandbox export") cat "${exportFile}";;`,
      "  *) exit 99;;",
      "esac",
    ].join("\n"),
  );
});

/** 가짜 bd가 읽는 도중에 빈 파일을 보지 않도록, 다른 파일에 쓴 뒤 이름을 바꿔 한 번에 교체합니다. */
async function replace(file: string, content: string): Promise<void> {
  await writeFile(`${file}.tmp`, content);
  await rename(`${file}.tmp`, file);
}

function exportLine(...comments: string[]): string {
  const record = {
    id: "t-1",
    title: "작업",
    status: "open",
    issue_type: "task",
    comments: comments.map((text, index) => ({ id: `c-${index}`, author: "agent", text })),
  };
  return `${JSON.stringify(record)}\n`;
}

async function exportCount(): Promise<number> {
  const log = await fakeBd.callsLog();
  return log.split("\n").filter((line) => line.endsWith("--sandbox export")).length;
}

async function commentsRead(): Promise<string[]> {
  const result = await readIssueExport(fakeBd.workDir);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value.flatMap((issue) => issue.comments.map((comment) => comment.text));
}

test("DB 비교값이 같은 동안 여러 번 읽어도 bd export는 한 번만 실행한다", async () => {
  expect(await commentsRead()).toEqual(["첫 댓글"]);
  expect(await commentsRead()).toEqual(["첫 댓글"]);
  expect(await commentsRead()).toEqual(["첫 댓글"]);

  expect(await exportCount()).toBe(1);
});

test("댓글을 추가해 DB 비교값이 바뀌면 bd export를 다시 실행해 새 댓글을 읽는다", async () => {
  expect(await commentsRead()).toEqual(["첫 댓글"]);

  await replace(exportFile, exportLine("첫 댓글", "새 댓글"));
  await replace(hashFile, "hash-2");

  expect(await commentsRead()).toEqual(["첫 댓글", "새 댓글"]);
  expect(await exportCount()).toBe(2);
});

test("DB 비교값을 읽지 못하면 지난 결과를 쓰지 않고 bd export를 다시 실행한다", async () => {
  expect(await commentsRead()).toEqual(["첫 댓글"]);

  await rm(hashFile);
  await replace(exportFile, exportLine("새 댓글"));

  expect(await commentsRead()).toEqual(["새 댓글"]);
  expect(await exportCount()).toBe(2);
});
