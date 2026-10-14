import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { test as base, expect } from "@playwright/test";
import {
  WORKSPACES_PATH,
  type RegisterWorkspaceRequest,
} from "../../src/shared/contract/workspaces";

const execFileAsync = promisify(execFile);

/**
 * 화면에서 고친 값이 bd에 저장될 때까지 기다리는 시간입니다.
 * 서버는 bd를 한 번에 하나씩 실행하고, 쓰기마다 SSE 알림으로 열린 화면이 목록과 상세를 다시 조회합니다.
 * 연달아 고치면 다음 쓰기가 이 조회 뒤에 줄을 서서 몇 초씩 걸리므로 기본 5초보다 넉넉히 둡니다.
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
  dependencies?: { id: string }[];
};

/**
 * 시나리오마다 빈 bd workspace를 임시 디렉터리에 만들고 서버의 현재 workspace로 바꿉니다.
 * 시나리오가 workspace를 쓰지 않아도 만들어, 앞 시나리오가 심은 이슈가 다음 시나리오에 보이지 않게 합니다.
 */
export const test = base.extend<{ workspace: BdWorkspace }>({
  workspace: [
    async ({ request }, use) => {
      const path = await mkdtemp(join(tmpdir(), "beads-desk-e2e-"));
      try {
        await run(path, "git", "init", "--quiet");
        await run(path, "bd", "init", "--prefix", "e2e", "--quiet", "--non-interactive");
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
