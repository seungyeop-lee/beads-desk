import { execFile } from "node:child_process";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import {
  WORKSPACES_PATH,
  type RegisterWorkspaceRequest,
} from "../../src/shared/contract/workspaces";
import { test as base } from "./appServer";

const execFileAsync = promisify(execFile);

/**
 * 화면에서 고친 값이 bd에 저장될 때까지 기다리는 시간입니다.
 * 서버는 bd를 한 번에 하나씩 실행해서, 쓰기는 그때 실행 중인 bd가 끝나야 시작합니다.
 * 시나리오가 bd를 함께 실행하는 동안 서버의 bd 한 번이 3초 넘게 걸린 적이 있어 기본 5초보다 넉넉히 둡니다.
 */
export const SAVE_TIMEOUT = 15_000;

/** 시나리오 하나가 쓰는 임시 bd workspace입니다. */
export type BdWorkspace = {
  path: string;
  /** 이 workspace에서 bd를 실행하고 표준 출력을 돌려줍니다. */
  bd(...args: string[]): Promise<string>;
  /** 이슈를 만들고 id를 돌려줍니다. args는 `bd create`의 나머지 인자입니다(예: `--type`, `decision`). */
  createIssue(title: string, ...args: string[]): Promise<string>;
  /** `bd show --json`으로 읽은 이슈입니다. 화면에서 바꾼 값이 bd에 저장됐는지 확인할 때 씁니다. */
  showIssue(id: string): Promise<BdIssue>;
};

/** `bd show --json` 출력 가운데 시나리오가 확인하는 필드입니다. */
export type BdIssue = {
  status: string;
  priority: number;
  assignee?: string;
  labels?: string[];
  parent?: string;
  dependencies?: { id: string; dependency_type: string }[];
};

/**
 * 시나리오마다 빈 bd workspace를 임시 디렉터리에 만들고 서버의 현재 workspace로 바꿉니다.
 * 시나리오가 workspace를 쓰지 않아도 만들어, 앞 시나리오가 심은 이슈가 다음 시나리오에 보이지 않게 합니다.
 * `bd init`은 한 번에 수 초씩 걸려서, worker마다 한 번만 초기화한 원본을 복사해 씁니다.
 */
export const test = base.extend<{ workspace: BdWorkspace }, { workspaceTemplate: string }>({
  workspaceTemplate: [
    // eslint-disable-next-line no-empty-pattern -- Playwright는 fixture의 첫 인자를 구조 분해로만 받습니다.
    async ({}, use) => {
      const path = await mkdtemp(join(tmpdir(), "beads-desk-e2e-template-"));
      try {
        await run(path, "git", "init", "--quiet");
        await run(path, "bd", "init", "--prefix", "e2e", "--quiet", "--non-interactive");
        await use(path);
      } finally {
        await rm(path, { recursive: true, force: true, maxRetries: 5 });
      }
    },
    { scope: "worker" },
  ],
  workspace: [
    async ({ request, workspaceTemplate }, use) => {
      const path = await mkdtemp(join(tmpdir(), "beads-desk-e2e-"));
      try {
        await cp(workspaceTemplate, path, { recursive: true });
        const body: RegisterWorkspaceRequest = { path, select: true };
        const response = await request.post(WORKSPACES_PATH, { data: body });
        expect(response.ok(), await response.text()).toBe(true);
        await use(bdWorkspace(path));
      } finally {
        // 시나리오가 끝난 뒤에도 서버가 줄 서 있던 조회로 이 workspace에서 bd를 실행하고 있을 수 있습니다.
        await rm(path, { recursive: true, force: true, maxRetries: 5 });
      }
    },
    { auto: true },
  ],
});

export { expect };

function bdWorkspace(path: string): BdWorkspace {
  const bd = (...args: string[]) => run(path, "bd", ...args);
  return {
    path,
    bd,
    async createIssue(title, ...args) {
      const created: { id: string } = JSON.parse(await bd("create", title, ...args, "--json"));
      return created.id;
    },
    async showIssue(id) {
      const [issue]: BdIssue[] = JSON.parse(await bd("show", id, "--json"));
      return issue;
    },
  };
}

async function run(cwd: string, command: string, ...args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(command, args, { cwd });
  return stdout;
}
