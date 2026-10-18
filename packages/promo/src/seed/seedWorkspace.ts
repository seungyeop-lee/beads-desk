import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { toImportRecord, type DemoIssue, type RunBd } from "./acmeProject.ts";
import { isolatedBdEnv } from "./isolatedBdEnv.ts";

/** seed가 만든 디렉터리에 남기는 표시입니다. 이 파일이 있는 디렉터리만 지우고 다시 만듭니다. */
const SEED_MARKER = ".beads-desk-promo-seed";

export type SeedOptions = {
  prefix: string;
  issues: DemoIssue[];
  /** import 뒤에 bd CLI로 더할 관계와 활동 기록입니다. git은 workspace의 git 저장소에서 같은 환경으로 실행합니다. */
  addActivity?: (bd: RunBd, git: RunBd) => void;
};

/** workspace 디렉터리에 git 저장소와 bd workspace를 새로 만들고 이슈를 넣습니다. */
export function seedWorkspace(workspace: string, { prefix, issues, addActivity }: SeedOptions) {
  prepareDirectory(workspace);
  const home = mkdtempSync(join(tmpdir(), "beads-desk-promo-home-"));
  try {
    const env = isolatedBdEnv(home);
    const run = (command: string, args: string[], input?: string) =>
      execFileSync(command, args, { cwd: workspace, env, input, encoding: "utf8" });
    const bd = (...args: string[]) => run("bd", args);
    const git = (...args: string[]) => run("git", args);

    git("init", "--quiet");
    bd("init", "--prefix", prefix, "--quiet", "--non-interactive", "--skip-agents");
    if (issues.length > 0) {
      const jsonl = issues.map((issue) => JSON.stringify(toImportRecord(issue))).join("\n");
      run("bd", ["import", "-"], jsonl);
    }
    addActivity?.(bd, git);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

/** 비어 있거나 없는 디렉터리는 그대로 쓰고, 전에 seed로 만든 디렉터리는 비웁니다. 그 밖의 디렉터리는 지우지 않고 멈춥니다. */
function prepareDirectory(path: string): void {
  if (existsSync(path)) {
    const entries = readdirSync(path);
    if (entries.length > 0 && !entries.includes(SEED_MARKER)) {
      throw new Error(`${path}가 비어 있지 않고 seed로 만든 디렉터리도 아니라서 멈춥니다.`);
    }
    rmSync(path, { recursive: true, force: true });
  }
  mkdirSync(path, { recursive: true });
  // seed가 중간에 실패해도 다시 실행할 수 있도록 git과 bd를 만들기 전에 남깁니다.
  writeFileSync(join(path, SEED_MARKER), "");
}
