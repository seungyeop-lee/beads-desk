import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

/**
 * 컴포넌트를 고정 데이터로 실제 chromium에서 그려, 가로 넘침·줄 수·경계 좌표처럼 CSS 배치로 정해지는 결과를 검사합니다.
 * bd와 서버 없이 실행되고, node 환경 unit test(루트 vitest.config.ts)와는 따로 `pnpm run test:components`로 실행합니다.
 * root를 이 디렉터리로 두어 postcss.config.mjs의 Tailwind 설정이 앱 빌드와 같게 적용됩니다.
 */
export default defineConfig({
  root: import.meta.dirname,
  // next/link가 process.env를 읽으므로, Next.js가 빌드 때 채우는 것처럼 빈 값을 넣어 둡니다.
  define: { "process.env": JSON.stringify({ NODE_ENV: "test" }) },
  plugins: [
    {
      // Next.js는 client가 import한 Server Action 파일을 서버 호출 참조로 바꿉니다. 테스트에서는 그 자리에 호출되면 실패하는 함수를 두어,
      // Server Action이 import하는 bd 실행 코드(node:child_process)가 browser로 들어오지 않게 합니다.
      name: "beads-desk:server-action-stubs",
      enforce: "pre",
      transform(code) {
        if (!/^\s*["']use server["']/.test(code)) return null;
        return [...code.matchAll(/^export async function (\w+)/gm)]
          .map(
            ([, name]) =>
              `export async function ${name}() { throw new Error("${name}: 컴포넌트 테스트에서는 Server Action을 실행하지 않습니다."); }`,
          )
          .join("\n");
      },
    },
  ],
  test: {
    alias: {
      "@/": new URL("./src/", import.meta.url).pathname,
    },
    include: ["src/**/*.browser.test.tsx"],
    setupFiles: ["./vitest.browser.setup.ts"],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: "chromium", viewport: { width: 1440, height: 900 } }],
    },
  },
});
