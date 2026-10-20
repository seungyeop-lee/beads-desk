import { execFile } from "node:child_process";
import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { promisify } from "node:util";
import { bdBin } from "@beads-desk/bd";
import { expect } from "@playwright/test";
import {
  WORKSPACES_PATH,
  workspaceHref,
  type RegisteredWorkspace,
  type RegisterWorkspaceRequest,
} from "../../src/shared/contract/workspaces";
import { test as base } from "./appServer";
import { throttleCpu, TIMEOUT_SCALE } from "./stress";
import type { UserHomeEnv } from "./userHome";

const execFileAsync = promisify(execFile);

/** fixture가 실행하는 bd입니다. 서버가 고르는 규칙을 `@beads-desk/bd`의 `bdBin`에서 가져와, fixture가 만든 DB를 서버가 같은 bd로 읽습니다. */
const BD = bdBin();

/**
 * 화면에서 고친 값이 bd에 저장될 때까지 기다리는 시간입니다.
 * 서버는 bd를 한 번에 하나씩 실행해서, 쓰기는 그때 실행 중인 bd가 끝나야 시작합니다.
 * 시나리오가 bd를 함께 실행하는 동안 서버의 bd 한 번이 3초 넘게 걸린 적이 있어 기본 5초보다 넉넉히 둡니다.
 * stress 모드에서는 TIMEOUT_SCALE배로 늘립니다.
 */
export const SAVE_TIMEOUT = 15_000 * TIMEOUT_SCALE;

/** 시나리오 하나가 쓰는 임시 bd workspace입니다. */
export type BdWorkspace = {
  path: string;
  /** 화면 주소에서 이 workspace를 가리키는 이름입니다. */
  slug: string;
  /** 이 workspace에서 bd를 실행하고 표준 출력을 돌려줍니다. */
  bd(...args: string[]): Promise<string>;
  /** 이슈를 만들고 id를 돌려줍니다. args는 `bd create`의 나머지 인자입니다(예: `--type`, `decision`). */
  createIssue(title: string, ...args: string[]): Promise<string>;
  /**
   * 이슈 여러 개와 그 사이 의존 관계를 `bd create --graph` 한 번으로 만들고, key마다 만든 id를 돌려줍니다.
   * bd 한 번이 수 초씩 걸릴 때가 있어, 이슈를 둘 이상 심을 때는 `createIssue`를 되풀이하지 않고 이것을 씁니다.
   */
  createIssues<K extends string>(
    issues: Record<K, SeedIssue<NoInfer<K>>>,
    dependencies?: SeedDependency<NoInfer<K>>[],
  ): Promise<Record<K, string>>;
  /** `bd show --json`으로 읽은 이슈입니다. 화면에서 바꾼 값이 bd에 저장됐는지 확인할 때 씁니다. */
  showIssue(id: string): Promise<BdIssue>;
  /** workspace의 git 저장소에 빈 커밋을 남깁니다. 커밋 메시지에서 이슈 id를 찾는 `bd orphans`를 확인할 때 씁니다. */
  commit(message: string): Promise<void>;
};

/** `createIssues`로 심는 이슈 하나입니다. 적지 않은 값은 `bd create`의 기본값을 따릅니다. */
export type SeedIssue<K extends string = string> = {
  title: string;
  type?: string;
  description?: string;
  priority?: number;
  status?: string;
  assignee?: string;
  labels?: string[];
  /** 같은 `createIssues` 호출에서 심는 상위 이슈의 key입니다. */
  parent?: K;
};

/**
 * `[의존하는 이슈 key, 의존 대상 이슈 key, 관계]`입니다. `bd dep add`와 같은 방향이고, 관계를 적지 않으면 blocks입니다.
 * blocks이면 앞 이슈가 뒤 이슈가 끝나기를 기다리고, discovered-from이면 앞 이슈를 뒤 이슈에서 발견한 것입니다.
 */
export type SeedDependency<K extends string = string> = [K, K, SeedDependencyType?];

/** `bd create --graph`의 간선 type으로 넣어 `bd dep add --type`과 같은 관계가 생기는 것을 확인한 값입니다. */
export type SeedDependencyType = "blocks" | "related" | "discovered-from";

/** `bd show --json` 출력 가운데 시나리오가 확인하는 필드입니다. */
export type BdIssue = {
  title: string;
  description?: string;
  status: string;
  priority: number;
  assignee?: string;
  labels?: string[];
  parent?: string;
  close_reason?: string;
  notes?: string;
  defer_until?: string;
  dependencies?: { id: string; dependency_type: string }[];
};

/**
 * 시나리오마다 빈 bd workspace를 임시 디렉터리에 만들어 서버에 등록하고, 그 workspace의 화면 주소(`/w/<이름>/`)를 baseURL로 둡니다.
 * 시나리오는 화면 경로를 `issues?view=ready`처럼 `/` 없이 써서 이 workspace의 화면을 엽니다.
 * 시나리오가 workspace를 쓰지 않아도 만들어, 앞 시나리오가 심은 이슈가 다음 시나리오에 보이지 않게 합니다.
 * `bd init`은 한 번에 수 초씩 걸려서, worker마다 한 번만 초기화한 원본을 복사해 씁니다.
 * init은 `--skip-agents`로 에이전트 통합 파일(CLAUDE.md, AGENTS.md, .cursor 등)을 만들지 않습니다. 시나리오 workspace에는 필요 없는 파일입니다.
 */
export const test = base.extend<
  {
    workspace: BdWorkspace;
    /** 같은 서버에 함께 등록한 두 번째 workspace입니다. 탭마다 다른 workspace를 여는 시나리오가 씁니다. */
    otherWorkspace: BdWorkspace;
  },
  { workspaceTemplate: string }
>({
  workspaceTemplate: [
    async ({ userHomeEnv }, use) => {
      const path = await mkdtemp(join(tmpdir(), "beads-desk-e2e-template-"));
      try {
        await run(path, userHomeEnv, "git", "init", "--quiet");
        await run(
          path,
          userHomeEnv,
          BD,
          "init",
          "--prefix",
          "e2e",
          "--quiet",
          "--non-interactive",
          "--skip-agents",
        );
        await use(path);
      } finally {
        await rm(path, { recursive: true, force: true, maxRetries: 5 });
      }
    },
    { scope: "worker" },
  ],
  workspace: [
    async ({ appServerUrl, workspaceTemplate, userHomeEnv }, use) => {
      const created = await createWorkspace(appServerUrl, workspaceTemplate, userHomeEnv);
      try {
        await use(created);
      } finally {
        await removeWorkspace(created);
      }
    },
    { auto: true },
  ],
  otherWorkspace: async ({ appServerUrl, workspaceTemplate, userHomeEnv }, use) => {
    const created = await createWorkspace(appServerUrl, workspaceTemplate, userHomeEnv);
    try {
      await use(created);
    } finally {
      await removeWorkspace(created);
    }
  },
  baseURL: async ({ appServerUrl, workspace }, use) => {
    await use(`${appServerUrl}${workspaceHref(workspace.slug)}/`);
  },
  page: async ({ page }, use, testInfo) => {
    await throttleCpu(page, testInfo.title);
    await use(page);
  },
});

export { expect };

/** template을 복사해 workspace를 만들고 서버에 등록합니다. */
async function createWorkspace(
  appServerUrl: string,
  workspaceTemplate: string,
  userHomeEnv: UserHomeEnv,
): Promise<BdWorkspace> {
  const path = await mkdtemp(join(tmpdir(), "beads-desk-e2e-"));
  try {
    // `bd init`이 template의 `core.hookspath`를 `.beads/hooks` 절대 경로로 적어 두므로, 복사한 workspace의 git 명령도 template의 hook을 실행합니다.
    // hook이 실행하는 `bd hooks run`은 cwd가 속한 workspace의 DB만 대상으로 해서 template의 DB는 그대로입니다.
    // template은 worker가 끝날 때까지 남아 있어 hook 경로도 유효하므로, 복사한 뒤 hookspath를 다시 설정하지 않습니다.
    await cp(workspaceTemplate, path, { recursive: true });
    // baseURL이 workspace fixture를 따르므로, baseURL을 쓰는 request fixture 대신 fetch로 등록합니다.
    const body: RegisterWorkspaceRequest = { path };
    const response = await fetch(`${appServerUrl}${WORKSPACES_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    expect(response.ok, await response.clone().text()).toBe(true);
    const { data }: { data: RegisteredWorkspace } = await response.json();
    return bdWorkspace(path, data.registered.slug, userHomeEnv);
  } catch (error) {
    await rm(path, { recursive: true, force: true, maxRetries: 5 });
    throw error;
  }
}

// 시나리오가 끝난 뒤에도 서버가 줄 서 있던 조회로 이 workspace에서 bd를 실행하고 있을 수 있습니다.
async function removeWorkspace({ path }: BdWorkspace): Promise<void> {
  await rm(path, { recursive: true, force: true, maxRetries: 5 });
}

function bdWorkspace(path: string, slug: string, userHomeEnv: UserHomeEnv): BdWorkspace {
  const bd = (...args: string[]) => run(path, userHomeEnv, BD, ...args);
  return {
    path,
    slug,
    bd,
    async createIssue(title, ...args) {
      const created: { id: string } = JSON.parse(await bd("create", title, ...args, "--json"));
      return created.id;
    },
    async createIssues(issues, dependencies = []) {
      const plan = {
        nodes: Object.entries<SeedIssue>(issues).map(([key, { parent, ...issue }]) => ({
          key,
          ...issue,
          parent_key: parent,
        })),
        edges: dependencies.map(([from, to, type = "blocks"]) => ({
          from_key: from,
          to_key: to,
          type,
        })),
      };
      // bd create --graph는 계획을 파일로만 받습니다. workspace와 함께 지워지도록 그 안에 둡니다.
      const planPath = join(path, "e2e-seed-plan.json");
      await writeFile(planPath, JSON.stringify(plan));
      const created: { ids: Record<keyof typeof issues, string> } = JSON.parse(
        await bd("create", "--graph", planPath, "--json"),
      );
      return created.ids;
    },
    async showIssue(id) {
      const [issue]: BdIssue[] = JSON.parse(await bd("show", id, "--json"));
      return issue;
    },
    async commit(message) {
      // 실행하는 환경에 git 사용자 설정이 없어도 커밋할 수 있도록 작성자를 정해 둡니다.
      await run(
        path,
        userHomeEnv,
        "git",
        "-c",
        "user.name=e2e",
        "-c",
        "user.email=e2e@example.com",
        "commit",
        "--allow-empty",
        "--quiet",
        "--message",
        message,
      );
    },
  };
}

/**
 * 명령은 서버의 bd와 같은 빈 HOME에서 실행합니다. `bd init`이 설치한 git hook은 git 명령 중에 PATH에서 bd를 찾으므로,
 * git에도 같은 HOME을 주고 `BD_BIN`이 절대 경로면 그 디렉터리를 PATH 앞에 넣어 hook도 같은 bd를 실행하게 합니다.
 */
async function run(
  cwd: string,
  userHomeEnv: UserHomeEnv,
  command: string,
  ...args: string[]
): Promise<string> {
  const env: NodeJS.ProcessEnv = { ...process.env, ...userHomeEnv };
  if (process.env.BD_BIN && isAbsolute(process.env.BD_BIN)) {
    env.PATH = `${dirname(process.env.BD_BIN)}:${env.PATH ?? ""}`;
  }
  const { stdout } = await execFileAsync(command, args, { cwd, env });
  return stdout;
}
