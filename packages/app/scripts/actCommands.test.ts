import { existsSync, readdirSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { parse } from "yaml";

const REPO_ROOT = new URL("../../../", import.meta.url);
const WORKFLOW_DIR = ".github/workflows/";

const workflows = readdirSync(new URL(WORKFLOW_DIR, REPO_ROOT))
  .filter((name) => /\.ya?ml$/.test(name))
  .map((name) => {
    const path = `${WORKFLOW_DIR}${name}`;
    const workflow = parse(readFileSync(new URL(path, REPO_ROOT), "utf8")) as {
      jobs: Record<string, unknown>;
    };
    return { path, jobIds: Object.keys(workflow.jobs) };
  });

const actCommands = readFileSync(new URL(".github/AGENTS.md", REPO_ROOT), "utf8")
  .split("\n")
  .filter((line) => line.startsWith("act "));

function optionValues(option: string): string[] {
  return actCommands.flatMap((command) =>
    [...command.matchAll(new RegExp(`\\s${option}\\s+(\\S+)`, "g"))].map(([, value]) => value!),
  );
}

function workflowsWithJob(jobId: string): string[] {
  return workflows.filter((workflow) => workflow.jobIds.includes(jobId)).map(({ path }) => path);
}

// .github/AGENTS.md의 act 명령은 손으로 적어 두므로, workflow에서 job ID나 파일 이름을 바꾸면 아무 job도 실행하지 않는 명령이 남습니다.
test(".github/AGENTS.md의 act -j job ID는 workflow 중 정확히 한 곳에 있다", () => {
  const jobIds = optionValues("-j");
  expect(jobIds).not.toEqual([]);

  const misplaced = jobIds
    .map((jobId) => ({ jobId, paths: workflowsWithJob(jobId) }))
    .filter(({ paths }) => paths.length !== 1);
  expect(misplaced).toEqual([]);
});

test(".github/AGENTS.md의 act -W 경로에 workflow 파일이 있다", () => {
  const missing = optionValues("-W").filter((path) => !existsSync(new URL(path, REPO_ROOT)));
  expect(missing).toEqual([]);
});

// act의 -j는 event와 관계없이 모든 workflow에서 같은 ID의 job을 찾아, 다른 workflow의 job까지 실행합니다.
test("두 workflow에 같은 job ID가 없다", () => {
  const duplicated = [...new Set(workflows.flatMap(({ jobIds }) => jobIds))]
    .map((jobId) => ({ jobId, paths: workflowsWithJob(jobId) }))
    .filter(({ paths }) => paths.length > 1);
  expect(duplicated).toEqual([]);
});
