import { defineConfig } from "vitest/config";

/** 설치된 실제 bd를 실행하는 테스트만 모은 설정입니다. 루트의 `pnpm run test:bd`로 실행합니다. */
export default defineConfig({
  test: {
    root: new URL(".", import.meta.url).pathname,
    environment: "node",
    include: ["src/realBd/**/*.test.ts"],
    testTimeout: 30_000,
    // bd는 명령마다 사용 통계를 사용자의 ~/.beads/eventsData에 쌓고, 가끔 실행한 bd의 cwd에서 `bd send-metrics`를 분리된 프로세스로 띄웁니다.
    // 이 값이 없으면 테스트 명령의 통계가 사용자의 통계에 섞이고, 지운 임시 workspace를 cwd로 둔 프로세스가 남을 수 있습니다.
    env: { DO_NOT_TRACK: "1" },
  },
});
