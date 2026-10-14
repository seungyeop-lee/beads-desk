import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // worker마다 서버를 따로 띄우므로(e2e/support/appServer.ts) 시나리오를 worker 사이에 나눠 실행할 수 있습니다.
  fullyParallel: true,
  workers: 4,
  // worker들이 bd를 동시에 실행하면 시나리오가 혼자 돌 때보다 두 배쯤 느려져, 저장을 여러 번 확인하는 시나리오가 기본 30초를 넘깁니다.
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
