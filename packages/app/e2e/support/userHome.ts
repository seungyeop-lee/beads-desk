import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test as base } from "@playwright/test";

/** e2e 서버와 fixture가 실행하는 명령에 덧붙이는 환경 변수입니다. */
export type UserHomeEnv = { HOME: string; XDG_CONFIG_HOME: string };

/**
 * bd는 환경 변수와 별도로 사용자 단위 설정 파일(`~/.config/bd/config.yaml`, `os.UserConfigDir()/bd/config.yaml`, `~/.beads/config.yaml`)을 읽습니다.
 * 개발자가 이 파일에 `readonly: true` 같은 값을 넣어 두면 fixture와 서버의 bd가 쓰기를 거부하거나 다른 형태의 JSON을 출력합니다.
 * bd 1.3.1에는 이 위치를 바꾸는 옵션이 없고 위치는 HOME(Linux에서는 `XDG_CONFIG_HOME`도)으로만 정해지므로, worker마다 빈 HOME을 만들어 서버와 fixture가 실행하는 명령에 줍니다.
 * worker 자신의 HOME은 바꾸지 않습니다. Playwright가 HOME 아래 캐시에서 chromium을 찾기 때문입니다.
 */
export const test = base.extend<object, { userHomeEnv: UserHomeEnv }>({
  userHomeEnv: [
    // eslint-disable-next-line no-empty-pattern -- Playwright는 fixture의 첫 인자를 구조 분해로만 받습니다.
    async ({}, use) => {
      const home = await mkdtemp(join(tmpdir(), "beads-desk-e2e-home-"));
      try {
        await use({ HOME: home, XDG_CONFIG_HOME: join(home, ".config") });
      } finally {
        await rm(home, { recursive: true, force: true, maxRetries: 5 });
      }
    },
    { scope: "worker" },
  ],
});
