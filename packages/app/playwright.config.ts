import { defineConfig, devices } from "@playwright/test";
import { usesRamDisk } from "./e2e/support/ramDisk";

// bd는 명령마다 사용 통계를 쌓고, 가끔 `bd send-metrics`를 실행한 bd의 cwd에서 분리된 프로세스로 띄워 보냅니다.
// 이 프로세스는 시나리오 workspace를 cwd로 잡은 채 실행이 끝난 뒤에도 남아, 서버를 종료해도 RAM disk를 뗄 수 없게 합니다.
// worker와 worker가 띄우는 서버, git hook까지 이 값을 물려받아, e2e가 실행하는 bd는 통계를 쌓지도 보내지도 않습니다.
process.env.DO_NOT_TRACK = "1";

// bd는 `BEADS_DIR`, `BEADS_DB`, `BEADS_ACTOR` 같은 `BEADS_` 변수와, 설정 key마다 대응하는 `BD_` 변수(`BD_READONLY`, `BD_JSON_ENVELOPE` 등)를 읽습니다.
// 개발자 셸에 이런 값이 있으면 fixture와 서버의 bd가 다른 DB를 쓰거나, 쓰기를 거부하거나, 다른 형태의 JSON을 출력합니다.
// 여기서 지운 값은 `DO_NOT_TRACK`처럼 worker와 서버, git hook이 실행하는 bd에 전달되지 않습니다.
// `BD_BIN`은 실행할 bd를 고르는 값이라 남깁니다. `BEADS_DESK_` 변수는 e2e 실행 설정에 쓰이므로 남기고, 서버에는 e2e/support/appServer.ts가 넘기지 않습니다.
for (const key of Object.keys(process.env)) {
  const readByBd =
    key.startsWith("BD_") || (key.startsWith("BEADS_") && !key.startsWith("BEADS_DESK_"));
  if (readByBd && key !== "BD_BIN") delete process.env[key];
}

export default defineConfig({
  testDir: "./e2e",
  // worker마다 서버를 따로 띄우므로(e2e/support/appServer.ts) 시나리오를 worker 사이에 나눠 실행할 수 있습니다.
  fullyParallel: true,
  // 다른 worktree의 e2e 실행이 끝나기를 기다린 뒤 시작합니다. `pnpm run test:e2e`로 실행하면 runE2e.ts가 빌드 전에 이미 기다렸으므로 다시 기다리지 않습니다.
  // teardown은 역순이고 runE2e.ts는 Playwright가 끝난 뒤 lock을 놓으므로, 어느 쪽이든 RAM disk를 뗀 뒤 차례를 넘깁니다.
  // worker마다 bd를 동시에 실행하면 디스크 I/O를 함께 쓰느라 bd 한 번이 느려집니다.
  // macOS에서는 시나리오 workspace를 RAM disk에 만들어 이 지연을 줄이고, 그만큼 worker를 늘립니다.
  // 디스크에서 worker 8개로 실행하면 저장 확인이 timeout을 넘기는 시나리오가 생깁니다.
  globalSetup: ["./e2e/support/runQueue.ts", "./e2e/support/ramDisk.ts"],
  workers: usesRamDisk() ? 8 : 4,
  // bd를 동시에 실행하면 시나리오가 혼자 돌 때보다 느려져, 저장을 여러 번 확인하는 시나리오가 기본 30초를 넘길 수 있습니다.
  timeout: 60_000,
  // 같은 이유로 서버에서 목록을 받아 와야 보이는 요소가 기본 5초 안에 나타나지 않을 때가 있습니다.
  expect: { timeout: 10_000 },
  retries: 0,
  forbidOnly: true,
  reporter: "list",
  use: {
    // 화면 언어는 브라우저 언어로 정해집니다. 시나리오가 한국어 이름으로 요소를 찾으므로 한국어 브라우저로 엽니다.
    locale: "ko-KR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
