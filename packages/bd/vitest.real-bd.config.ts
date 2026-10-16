import { defineConfig } from "vitest/config";

/** 설치된 실제 bd를 실행하는 테스트만 모은 설정입니다. 루트의 `pnpm run test:bd`로 실행합니다. */
export default defineConfig({
  test: {
    root: new URL(".", import.meta.url).pathname,
    environment: "node",
    include: ["src/realBd/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
