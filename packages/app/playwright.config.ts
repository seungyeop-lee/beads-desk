import { tmpdir } from "node:os";
import { defineConfig, devices } from "@playwright/test";

// bd-desk와 next dev가 쓰는 3000번대와 겹치지 않는 포트입니다.
const port = 3900;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  // 서버의 현재 workspace는 서버 전체에서 하나라서, 시나리오가 workspace를 바꾸는 동안 다른 시나리오가 돌면 안 됩니다.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  reporter: "list",
  webServer: {
    command: `next start --hostname 127.0.0.1 --port ${port}`,
    url: `${baseURL}/api/health`,
    // 시작 workspace를 지정하지 않으면 서버가 cwd의 상위에서 이 저장소의 `.beads`를 찾아 씁니다.
    // `.beads`가 없는 디렉터리를 주어, 시나리오가 workspace를 고르기 전에도 실제 저장소를 보지 않게 합니다.
    env: { BEADS_DESK_WORKSPACE: tmpdir() },
    reuseExistingServer: false,
    gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
    stdout: "pipe",
    stderr: "pipe",
  },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
