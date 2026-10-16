import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, realpathSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

// launcher와 서버가 함께 쓰는 workspace 탐색 규칙입니다. launcher는 서버 bundle을 불러올 수 없으므로
// 규칙을 이 파일에 plain JS로 두고, 서버(`src/server/infra/runtime/serverRuntime.ts`)는 이 파일을 bundle에 넣어 씁니다.

/**
 * path에서 bd가 쓰는 workspace 디렉터리를 찾습니다. 디렉터리가 없거나 workspace를 찾지 못하면 null을 돌려줍니다.
 *
 * bd가 workspace를 찾는 방식을 따릅니다. path부터 git 저장소 최상위까지(git 밖이면 파일 시스템 루트까지) 올라가며 `.beads`를 찾고,
 * git worktree라 찾지 못했으면 bd처럼 main 저장소의 `.beads`를 씁니다. 이때 workspace는 worktree 최상위 디렉터리로 두어,
 * bd 실행과 git을 읽는 기능이 그 worktree의 브랜치를 기준으로 동작하게 합니다.
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
function hasBeadsProject(dir) {
  const beads = join(dir, ".beads");
  return (
    isDirectory(beads) &&
    readdirSync(beads).some(
      (name) => name === "metadata.json" || name === "config.yaml" || name.endsWith(".db"),
    )
  );
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
