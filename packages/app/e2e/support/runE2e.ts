import { spawn } from "node:child_process";
import { formatSeconds, heldLockEnv, waitForTurn } from "./runQueue.ts";

/**
 * `pnpm run test:e2e`가 실행하는 스크립트입니다. 다른 e2e 실행이 끝나 차례를 받은 뒤에 `next build`를 실행해,
 * 기다리는 동안의 빌드가 돌고 있는 e2e와 CPU를 나눠 쓰지 않게 합니다. 인자는 `playwright test`에 그대로 넘깁니다.
 * 끝나면 기다린 시간, 빌드 시간, 시나리오 실행 시간을 한 줄로 나눠 출력합니다.
 */
const turn = await waitForTurn();
try {
  const build = await timed(() => run("next", ["build"]));
  const test =
    build.code === 0
      ? await timed(() => run("playwright", ["test", ...process.argv.slice(2)], heldLockEnv()))
      : { code: build.code, ms: 0 };
  console.log(
    `e2e 대기 ${formatSeconds(turn.waitedMs)}, 빌드 ${formatSeconds(build.ms)}, 시나리오 실행 ${formatSeconds(test.ms)}`,
  );
  process.exitCode = test.code;
} finally {
  await turn.release();
}

async function timed(task: () => Promise<number>): Promise<{ code: number; ms: number }> {
  const startedAt = Date.now();
  const code = await task();
  return { code, ms: Date.now() - startedAt };
}

function run(command: string, args: string[], env: Record<string, string> = {}): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env: { ...process.env, ...env } });
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}
