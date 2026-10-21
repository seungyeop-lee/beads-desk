import { chmod, mkdtemp, readFile, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, vi } from "vitest";

export type FakeResponse = { stdout?: string; stderr?: string; code?: number };

/**
 * bd 실행을 가짜 스크립트로 대신하는 app 서버 테스트 환경입니다.
 * `packages/bd/src/fakeBd.ts`와 같은 방식으로, 테스트마다 임시 디렉터리를 새로 만들고 가짜 bd를 `vi.stubEnv`로 BD_BIN에 지정합니다.
 * 테스트가 끝나면 `vi.unstubAllEnvs()`를 호출하므로, 테스트 파일이 `vi.stubEnv`로 바꾼 다른 환경 변수도 함께 되돌아갑니다.
 * app은 bd 패키지의 테스트 헬퍼를 import할 수 없어 이 복사본을 둡니다.
 * 가짜 bd는 실행마다 cwd와 인자를 calls.log에 남기므로, bd를 실행했는지와 어떤 인자를 넘겼는지 확인할 수 있습니다.
 */
export function fakeBdWorkspace(prefix: string): {
  /** 테스트마다 새로 만드는 임시 workspace 디렉터리입니다. */
  readonly workDir: string;
  /**
   * `--sandbox` 뒤의 인자 문자열이 정확히 일치할 때만 응답하는 가짜 bd를 지정합니다.
   * 일치하는 응답이 없으면 종료 코드 99로 실패합니다.
   */
  useFakeBd(responses: Record<string, FakeResponse>): Promise<void>;
  /** 주어진 셸 본문을 그대로 실행하는 가짜 bd를 지정합니다. */
  useFakeBdScript(body: string): Promise<void>;
  /** 가짜 bd가 남긴 호출 기록을 읽습니다. bd를 실행하지 않은 테스트에서는 읽기가 실패합니다. */
  callsLog(): Promise<string>;
} {
  let currentDir = "";

  beforeEach(async () => {
    currentDir = await realpath(await mkdtemp(join(tmpdir(), prefix)));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function install(body: string): Promise<void> {
    const fakeBd = join(currentDir, "fake-bd");
    await writeFile(
      fakeBd,
      `#!/bin/sh\necho "$(pwd) $*" >> "${join(currentDir, "calls.log")}"\n${body}\n`,
    );
    await chmod(fakeBd, 0o755);
    vi.stubEnv("BD_BIN", fakeBd);
  }

  return {
    get workDir() {
      return currentDir;
    },
    async useFakeBd(responses) {
      const cases = await Promise.all(
        Object.entries(responses).map(async ([args, response], index) => {
          const stdoutFile = join(currentDir, `stdout-${index}`);
          await writeFile(stdoutFile, response.stdout ?? "");
          const stderr = response.stderr ? `echo "${response.stderr}" >&2; ` : "";
          return `  "--sandbox ${args}") cat "${stdoutFile}"; ${stderr}exit ${response.code ?? 0};;`;
        }),
      );
      await install(
        `case "$*" in\n${cases.join("\n")}\n  *) echo "unexpected: $*" >&2; exit 99;;\nesac`,
      );
    },
    useFakeBdScript: install,
    callsLog() {
      return readFile(join(currentDir, "calls.log"), "utf8");
    },
  };
}
