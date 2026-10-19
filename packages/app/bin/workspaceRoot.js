import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

// launcher와 서버가 함께 쓰는 workspace 탐색 규칙입니다. launcher는 서버 bundle을 불러올 수 없으므로
// 규칙을 이 파일에 plain JS로 두고, 서버(`src/server/infra/runtime/serverRuntime.ts`)는 이 파일을 bundle에 넣어 씁니다.

/**
 * path에서 bd가 쓰는 workspace 디렉터리를 찾습니다. 디렉터리가 없거나 workspace를 찾지 못하면 null을 돌려줍니다.
 *
 * bd가 workspace를 찾는 방식을 따릅니다. path부터 git 저장소 최상위까지(git 밖이면 파일 시스템 루트까지) 올라가며 `.beads`를 찾고,
 * git worktree라 찾지 못했으면 bd처럼 main 저장소의 `.beads`를 씁니다. 이때 workspace는 worktree 최상위 디렉터리로 두어,
 * bd 실행과 git을 읽는 기능이 그 worktree의 브랜치를 기준으로 동작하게 합니다.
 * `.beads/redirect`로 다른 `.beads`의 DB를 쓰는 디렉터리도 workspace는 redirect 대상이 아니라 redirect를 둔 디렉터리입니다.
 * bd는 그 디렉터리에서 실행해도 redirect를 따라가고, git을 읽는 기능은 그 디렉터리의 저장소를 기준으로 동작해야 합니다.
 * symlink를 거친 경로와 실제 경로가 다른 workspace로 등록되지 않게 실제 경로를 돌려줍니다.
 *
 * @param {string} path
 * @returns {string | null}
 */
export function findWorkspaceRoot(path) {
  if (!isDirectory(resolve(path))) return null;
  const start = realpathSync(resolve(path));
  const git = gitRepository(start);
  for (let dir = start; ; dir = dirname(dir)) {
    if (hasBeadsProject(dir)) return dir;
    if (dir === git?.topLevel || dirname(dir) === dir) break;
  }
  return git && hasBeadsProject(dirname(git.commonDir)) ? git.topLevel : null;
}

// bd는 설정이나 DB 파일이 있는 `.beads`만 workspace로 봅니다. bd가 전역 상태를 두는 `~/.beads`는 workspace가 아닙니다.
// `.beads`에 redirect만 있으면 redirect가 가리키는 `.beads`에 설정이나 DB 파일이 있어야 합니다.
// 깨진 redirect를 workspace로 받으면 화면에는 bd 오류만 보이므로 받지 않습니다.
function hasBeadsProject(dir) {
  const beads = join(dir, ".beads");
  if (!isDirectory(beads)) return false;
  const target = redirectTarget(dir);
  return hasBeadsData(beads) || (target !== null && isDirectory(target) && hasBeadsData(target));
}

function hasBeadsData(beads) {
  return readdirSync(beads).some(
    (name) => name === "metadata.json" || name === "config.yaml" || name.endsWith(".db"),
  );
}

/**
 * dir의 `.beads/redirect`가 가리키는 `.beads` 경로를 돌려줍니다. redirect 파일이 없거나 경로가 적혀 있지 않으면 null을 돌려줍니다.
 * bd 1.3.1처럼 빈 줄과 `#`으로 시작하는 줄을 건너뛰고, 상대 경로는 `.beads`가 아니라 dir을 기준으로 해석합니다.
 * 대상의 redirect는 bd도 따라가지 않으므로 한 번만 따라갑니다.
 */
function redirectTarget(dir) {
  const file = join(dir, ".beads", "redirect");
  if (!existsSync(file) || !statSync(file).isFile()) return null;
  const target = readFileSync(file, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line !== "" && !line.startsWith("#"));
  return target ? resolve(dir, target) : null;
}

/**
 * dir이 속한 git 저장소의 최상위 디렉터리와 공용 git 디렉터리를 돌려줍니다. worktree면 공용 git 디렉터리가 main 저장소의 `.git`입니다.
 * git 저장소가 아니거나 git이 없으면 null을 돌려줍니다.
 */
function gitRepository(dir) {
  // git hook 안에서 실행하면 GIT_DIR 등이 다른 저장소를 가리키므로, dir만으로 저장소를 찾게 GIT_ 환경 변수를 뺍니다.
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith("GIT_")) delete env[key];
  const result = spawnSync(
    "git",
    ["rev-parse", "--path-format=absolute", "--show-toplevel", "--git-common-dir"],
    { cwd: dir, env, encoding: "utf8" },
  );
  const [topLevel, commonDir] = result.status === 0 ? result.stdout.trim().split("\n") : [];
  return topLevel && commonDir
    ? { topLevel: realpathSync(topLevel), commonDir: realpathSync(commonDir) }
    : null;
}

function isDirectory(path) {
  return existsSync(path) && statSync(path).isDirectory();
}
