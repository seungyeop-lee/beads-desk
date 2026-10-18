import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { ACME_PREFIX, acmeIssues, addCliActivity, toImportRecord } from "./acmeProject.ts";

/** seed가 만든 디렉터리에 남기는 표시입니다. 이 파일이 있는 디렉터리만 지우고 다시 만듭니다. */
const SEED_MARKER = ".beads-desk-promo-seed";

const target = process.argv[2];
if (!target) {
  console.error("사용법: pnpm --filter promo run seed <디렉터리>");
  process.exit(1);
}
// pnpm은 package 디렉터리에서 script를 실행하므로, 상대 경로는 명령을 입력한 디렉터리(INIT_CWD) 기준으로 풉니다.
const workspace = resolve(process.env.INIT_CWD ?? process.cwd(), target);

prepareDirectory(workspace);
const home = mkdtempSync(join(tmpdir(), "beads-desk-promo-home-"));
try {
  const env = isolatedEnv(home);
  const run = (command: string, args: string[], input?: string) =>
    execFileSync(command, args, { cwd: workspace, env, input, encoding: "utf8" });
  const bd = (...args: string[]) => run("bd", args);

  run("git", ["init", "--quiet"]);
  bd("init", "--prefix", ACME_PREFIX, "--quiet", "--non-interactive", "--skip-agents");
  const jsonl = acmeIssues(Date.now())
    .map((issue) => JSON.stringify(toImportRecord(issue)))
    .join("\n");
  run("bd", ["import", "-"], jsonl);
  addCliActivity(bd);
} finally {
  rmSync(home, { recursive: true, force: true });
}
console.log(`${workspace}에 데모 workspace를 만들었습니다.`);

/** 비어 있거나 없는 디렉터리는 그대로 쓰고, 전에 seed로 만든 디렉터리는 비웁니다. 그 밖의 디렉터리는 지우지 않고 멈춥니다. */
function prepareDirectory(path: string): void {
  if (existsSync(path)) {
    const entries = readdirSync(path);
    if (entries.length > 0 && !entries.includes(SEED_MARKER)) {
      console.error(`${path}가 비어 있지 않고 seed로 만든 디렉터리도 아니라서 멈춥니다.`);
      process.exit(1);
    }
    rmSync(path, { recursive: true, force: true });
  }
  mkdirSync(path, { recursive: true });
  // seed가 중간에 실패해도 다시 실행할 수 있도록 git과 bd를 만들기 전에 남깁니다.
  writeFileSync(join(path, SEED_MARKER), "");
}

/**
 * bd는 사용자 단위 설정 파일(`~/.config/bd/config.yaml` 등)과 BD_*, BEADS_* 환경 변수를 읽습니다.
 * 실행한 사람의 설정이 섞이면 쓰기를 거부하거나, BEADS_DIR처럼 DB 위치를 정하는 변수 때문에 이 디렉터리가 아닌 다른 DB에 쓸 수 있습니다.
 * 그래서 빈 HOME을 주고 BD_*, BEADS_* 환경 변수를 뺍니다.
 * git 작성자와 bd actor도 정해 두어, 실행한 사람의 이름이 데모 데이터에 남지 않게 합니다.
 */
function isolatedEnv(home: string): NodeJS.ProcessEnv {
  const inherited = Object.entries(process.env).filter(
    ([name]) => !name.startsWith("BD_") && !name.startsWith("BEADS_"),
  );
  return {
    ...Object.fromEntries(inherited),
    HOME: home,
    XDG_CONFIG_HOME: join(home, ".config"),
    DO_NOT_TRACK: "1",
    BEADS_ACTOR: "sam",
    GIT_AUTHOR_NAME: "Acme Team",
    GIT_AUTHOR_EMAIL: "team@acme.example",
    GIT_COMMITTER_NAME: "Acme Team",
    GIT_COMMITTER_EMAIL: "team@acme.example",
  };
}
