import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

/**
 * `pnpm run check`가 실행하는 스크립트입니다. `playwright test --list`의 전체 테스트 수가 `e2e/testLimit.json`의 `limit`을 넘거나,
 * `limit`을 `baseline`보다 올린 수와 `reasons`의 항목 수가 다르면 실패합니다. 시나리오는 실행하지 않습니다.
 */
const LIMIT_FILE = "packages/app/e2e/testLimit.json";
const GUIDE = 'packages/app/e2e/AGENTS.md의 "시나리오 범위"와 "테스트 수 상한" 절';

const { baseline, limit, reasons } = JSON.parse(
  readFileSync(new URL("../testLimit.json", import.meta.url), "utf8"),
) as { baseline: number; limit: number; reasons: string[] };
const total = listedTestCount();
const statedReasons = reasons.filter((reason) => reason.trim() !== "").length;

const failures: string[] = [];
if (limit - baseline !== statedReasons) {
  failures.push(
    `${LIMIT_FILE}의 limit(${limit})은 baseline(${baseline})보다 ${limit - baseline}만큼 높지만 reasons는 ${statedReasons}개입니다. ` +
      "올린 테스트 하나마다 unit·컴포넌트 테스트로 확인할 수 없는 흐름을 reasons에 하나씩 적습니다.",
  );
}
if (total > limit) {
  failures.push(
    `e2e 테스트가 ${total}개로 상한 ${limit}개를 넘었습니다. 먼저 ${GUIDE}에 따라 더한 test를 unit·컴포넌트 테스트나 기존 test의 단계로 옮길 수 있는지 확인합니다. ` +
      `그래도 새 test가 필요하면 ${LIMIT_FILE}의 limit을 올리고, 올린 만큼 reasons에 이유를 하나씩 적습니다.`,
  );
}

if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else {
  console.log(`e2e 테스트 ${total}개, 상한 ${limit}개`);
}

function listedTestCount(): number {
  const list = spawnSync("playwright", ["test", "--list"], { encoding: "utf8" });
  if (list.error) throw list.error;
  const total = /^Total: (\d+) tests? in/m.exec(list.stdout)?.[1];
  if (list.status !== 0 || total === undefined) {
    process.stdout.write(list.stdout);
    process.stderr.write(list.stderr);
    throw new Error("`playwright test --list`의 출력에서 전체 테스트 수를 읽지 못했습니다.");
  }
  return Number(total);
}
