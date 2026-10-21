import { existsSync } from "node:fs";
import { win32 } from "node:path";

/** 실행할 bd를 고를 때 보는 실행 환경입니다. 테스트에서 다른 플랫폼의 환경을 넣을 때만 지정합니다. */
export type BdBinHost = {
  platform: NodeJS.Platform;
  env: NodeJS.ProcessEnv;
  isFile: (path: string) => boolean;
};

const BD_EXE_GUIDANCE = "Set BD_BIN to the full path of bd.exe.";

/**
 * 실행할 bd를 고르는 규칙입니다. e2e fixture가 서버와 같은 bd를 실행하도록 이 규칙을 가져가 씁니다.
 * macOS와 Linux에서는 `BD_BIN`이 있으면 그 값을, 없으면 `bd`를 돌려줍니다.
 * Windows에서 실행할 bd.exe를 찾지 못하면, `BD_BIN`에 bd.exe 경로를 지정하라는 문구를 담아 throw합니다.
 */
export function bdBin(host: BdBinHost = currentHost()): string {
  if (host.platform !== "win32") return host.env.BD_BIN || "bd";
  return windowsBdBin(host);
}

function currentHost(): BdBinHost {
  return { platform: process.platform, env: process.env, isFile: existsSync };
}

// bd를 셸 없이 실행하는 Node의 spawn은 PATHEXT를 적용하지 않고 .cmd 파일을 실행하지도 않습니다.
// 그래서 npm으로 설치한 bd의 shim(bd.cmd)은 실행하지 못하므로, shim이 감싸는 bd.exe를 찾아 실행합니다.
// pnpm, volta 같은 다른 도구의 shim은 구조가 달라 풀지 않고, 사용자가 BD_BIN에 bd.exe를 지정하게 합니다.
function windowsBdBin(host: BdBinHost): string {
  const configured = windowsEnv(host.env, "BD_BIN");
  if (configured) {
    if (win32.extname(configured).toLowerCase() !== ".cmd") return configured;
    const target = npmShimTarget(configured);
    if (host.isFile(target)) return target;
    throw new Error(
      `BD_BIN points to ${configured}, but the bd.exe it wraps was not found at ${target}. ${BD_EXE_GUIDANCE}`,
    );
  }

  // 터미널에서 bd를 입력했을 때와 같은 bd를 고르도록, PATH 순서대로 디렉터리마다 bd.exe를 먼저 확인합니다.
  // 풀지 못하는 shim만 있는 디렉터리는 건너뜁니다. Node도 .cmd만 있는 디렉터리를 건너뛰므로, 뒤 디렉터리의 bd.exe를 실행하던 환경이 그대로 동작합니다.
  for (const dir of windowsPathDirs(host.env)) {
    const exe = win32.join(dir, "bd.exe");
    if (host.isFile(exe)) return exe;
    const shim = win32.join(dir, "bd.cmd");
    if (host.isFile(shim) && host.isFile(npmShimTarget(shim))) return npmShimTarget(shim);
  }
  throw new Error(`bd.exe was not found on PATH. ${BD_EXE_GUIDANCE}`);
}

// npm 전역 설치에서 @beads/bd의 bin/bd.js는 같은 디렉터리의 bd.exe를 실행하는 wrapper이고, shim은 그 패키지 옆에 놓입니다.
function npmShimTarget(shim: string): string {
  return win32.join(win32.dirname(shim), "node_modules", "@beads", "bd", "bin", "bd.exe");
}

function windowsPathDirs(env: NodeJS.ProcessEnv): string[] {
  return (windowsEnv(env, "PATH") ?? "")
    .split(win32.delimiter)
    .map((dir) => dir.replace(/^"(.*)"$/, "$1"))
    .filter((dir) => dir.length > 0);
}

// Windows의 환경 변수 이름은 대소문자를 구분하지 않아 PATH가 Path로 들어오기도 합니다.
// process.env는 이를 알아서 처리하지만, 주입한 환경은 일반 객체라서 이름을 직접 비교합니다.
function windowsEnv(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const key = Object.keys(env).find((candidate) => candidate.toUpperCase() === name);
  return key === undefined ? undefined : env[key];
}
