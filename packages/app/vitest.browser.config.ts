import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";
import type { BrowserCommandContext } from "vitest/node";

/**
 * 컴포넌트를 고정 데이터로 실제 chromium에서 그려, 가로 넘침·줄 수·경계 좌표처럼 CSS 배치로 정해지는 결과를 검사합니다.
 * bd와 서버 없이 실행되고, node 환경 unit test(루트 vitest.config.ts)와는 따로 `pnpm run test:components`로 실행합니다.
 * root를 이 디렉터리로 두어 postcss.config.mjs의 Tailwind 설정이 앱 빌드와 같게 적용됩니다.
 */
export default defineConfig({
  root: import.meta.dirname,
  // next/link가 process.env를 읽으므로, Next.js가 빌드 때 채우는 것처럼 빈 값을 넣어 둡니다.
  define: { "process.env": JSON.stringify({ NODE_ENV: "test" }) },
  // Vite는 lockfile과 설정이 그대로면 test 파일을 다시 훑지 않고 이전 실행에서 만든 의존성 cache를 씁니다.
  // 그 cache에 없는 package를 실행 중에 만나면 test를 다시 로드하고, 다시 로드된 test는 Invalid hook call로 실패합니다.
  // 컴포넌트 테스트가 거치는 코드에서 이미 설치된 package를 새로 import하면 그 package를 이 목록에 더합니다.
  // package를 새로 설치한 경우에는 lockfile이 바뀌어 Vite가 cache를 다시 만들므로 더하지 않아도 됩니다.
  optimizeDeps: { include: ["recharts", "@milkdown/kit/prose/view"] },
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
      // Playwright의 기본 headless 실행은 스크롤바를 숨겨 스크롤되는 요소의 안쪽 폭과 높이가 스크롤바만큼 넓어집니다.
      // 스크롤바를 보이게 띄워, 스크롤바가 자리를 차지하는 브라우저에서만 생기는 넘침과 어긋남도 검사에 드러나게 합니다.
      provider: playwright({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } }),
      instances: [{ browser: "chromium", viewport: { width: 1440, height: 900 } }],
      // userEvent에는 마우스 단추를 누른 채로 두는 동작이 없어, 누르는 동안의 커서와 끌기 시작을 확인하는 테스트가 이 명령으로 누르고 뗍니다.
      // 마우스는 마지막으로 옮긴 자리(userEvent.hover)에서 누르고 뗍니다.
      commands: {
        mouseDown: ({ page }: BrowserCommandContext) => page.mouse.down(),
        mouseUp: ({ page }: BrowserCommandContext) => page.mouse.up(),
        // 운영체제의 밝은·어두운 모드를 따르는 테마를 확인하는 테스트가 이 명령으로 운영체제 설정을 바꿉니다. null이면 바꾼 설정을 되돌립니다.
        emulateColorScheme: (
          { page }: BrowserCommandContext,
          colorScheme: "light" | "dark" | null,
        ) => page.emulateMedia({ colorScheme }),
      },
    },
  },
});
