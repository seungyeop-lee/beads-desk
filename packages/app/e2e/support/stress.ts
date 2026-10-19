import { constants } from "node:fs";
import { access, appendFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { bdBin } from "@beads-desk/bd";
import type { Page } from "@playwright/test";

// e2e stress 모드는 아래 두 환경 변수 가운데 하나라도 주면 켜집니다. 둘 다 없으면 실행은 평소와 같습니다.
// `BD_` 접두사를 쓰면 playwright.config.ts가 지우므로 `BEADS_DESK_E2E_`를 씁니다. 이 변수는 e2e/support/appServer.ts가 서버에 넘기지 않습니다.
/** `<최소>-<최대>` 밀리초입니다. 서버, fixture, git hook이 실행하는 bd가 이 범위에서 임의로 기다린 뒤 실행됩니다. */
const BD_DELAY_ENV = "BEADS_DESK_E2E_BD_DELAY_MS";
/** 시나리오 page의 Chromium CPU를 이 배수만큼 느리게 합니다. */
const CPU_THROTTLE_ENV = "BEADS_DESK_E2E_CPU_THROTTLE";
/** global setup이 만든 디렉터리입니다. worker가 물려받아 CPU 제한을 적용한 page를 이 아래에 기록합니다. */
const RECORD_DIR_ENV = "BEADS_DESK_E2E_STRESS_DIR";

const BD_CALLS_FILE = "bd-calls.log";
const THROTTLED_PAGES_FILE = "cpu-throttled-pages.log";

type DelayRange = { min: number; max: number };

const bdDelay = parseBdDelay(process.env[BD_DELAY_ENV]);
const cpuThrottleRate = parseCpuThrottle(process.env[CPU_THROTTLE_ENV]);

/**
 * stress 모드에서 기다리는 timeout에 곱하는 값입니다. expect timeout 10초는 40초가 됩니다.
 * 늦은 조회는 실패로 보지 않고, 순서나 상태를 가정한 실패만 드러내려는 값입니다.
 * 두 변화가 동시에 일어나는지처럼 순서를 확인하는 짧은 timeout에는 곱하지 않습니다.
 */
export const TIMEOUT_SCALE = bdDelay || cpuThrottleRate ? 4 : 1;

/**
 * Playwright global setup입니다. bd 지연을 켜면 기다린 뒤 실제 bd를 실행하는 wrapper를 만들어 `BD_BIN`으로 지정합니다.
 * worker, worker가 띄우는 서버, git hook은 이 값을 물려받습니다(git hook은 e2e/support/bdWorkspace.ts가 PATH에 넣은 wrapper를 찾습니다).
 * 반환한 teardown은 실행이 끝날 때 wrapper를 거친 bd 실행 수와 CPU 제한을 적용한 page 수를 출력합니다.
 * RAM disk는 실행이 끝나면 떼어지므로, playwright.config.ts에서 RAM disk보다 먼저 실행해 기록을 디스크에 둡니다.
 */
export default async function startStress(): Promise<(() => Promise<void>) | undefined> {
  if (!bdDelay && !cpuThrottleRate) return undefined;

  const dir = await mkdtemp(join(tmpdir(), "beads-desk-e2e-stress-"));
  process.env[RECORD_DIR_ENV] = dir;
  if (bdDelay) {
    const wrapper = join(dir, "bd");
    const script = bdWrapperScript(
      await findExecutable(bdBin()),
      bdDelay,
      join(dir, BD_CALLS_FILE),
    );
    await writeFile(wrapper, script, { mode: 0o755 });
    process.env.BD_BIN = wrapper;
  }
  console.log(`e2e stress 모드: ${describeConditions()}, timeout ${TIMEOUT_SCALE}배`);

  return async () => {
    console.log(`e2e stress 모드 적용 결과: ${await describeApplied(dir)}`);
    await rm(dir, { recursive: true, force: true });
  };
}

/** CPU 제한을 켰으면 page에 적용하고 기록합니다. 제한은 같은 page에서 주소를 옮겨도 유지됩니다. */
export async function throttleCpu(page: Page, testTitle: string): Promise<void> {
  if (!cpuThrottleRate) return;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpuThrottleRate });
  const dir = process.env[RECORD_DIR_ENV];
  if (dir) await appendFile(join(dir, THROTTLED_PAGES_FILE), `${testTitle}\n`);
}

function parseBdDelay(value: string | undefined): DelayRange | undefined {
  if (!value) return undefined;
  const match = /^(\d+)-(\d+)$/.exec(value);
  const range = match && { min: Number(match[1]), max: Number(match[2]) };
  // wrapper는 bash의 $RANDOM(0–32767)으로 지연을 고릅니다.
  if (!range || range.min > range.max || range.max - range.min > 32_767) {
    throw new Error(
      `${BD_DELAY_ENV}는 "500-1500"처럼 <최소>-<최대> 밀리초로 주고, 범위 폭은 32767 이하여야 합니다: ${value}`,
    );
  }
  return range;
}

function parseCpuThrottle(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate <= 1) {
    throw new Error(`${CPU_THROTTLE_ENV}는 1보다 큰 배수로 줍니다: ${value}`);
  }
  return rate;
}

/** wrapper는 첫 인자를 기록합니다. 서버는 늘 `--sandbox`를 붙이고, git hook은 `bd hooks run`을 실행해 실행한 쪽을 가릴 수 있습니다. */
function bdWrapperScript(realBd: string, { min, max }: DelayRange, callLog: string): string {
  return `#!/usr/bin/env bash
printf '%s\\n' "$1" >> ${shellQuote(callLog)}
ms=$(( ${min} + RANDOM % ${max - min + 1} ))
sleep "$((ms / 1000)).$(printf '%03d' $((ms % 1000)))"
exec ${shellQuote(realBd)} "$@"
`;
}

/** wrapper가 PATH에서 자기 자신을 다시 찾지 않도록, 실제 bd를 절대 경로로 정해 둡니다. */
async function findExecutable(command: string): Promise<string> {
  if (command.includes("/")) return resolve(command);
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    const candidate = join(dir, command);
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // 다음 PATH 항목을 봅니다.
    }
  }
  throw new Error(`bd 지연 wrapper가 실행할 ${command}를 PATH에서 찾지 못했습니다.`);
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function describeConditions(): string {
  const conditions = [];
  if (bdDelay) conditions.push(`bd 지연 ${bdDelay.min}–${bdDelay.max}ms`);
  if (cpuThrottleRate) conditions.push(`CPU ${cpuThrottleRate}배 제한`);
  return conditions.join(", ");
}

async function describeApplied(dir: string): Promise<string> {
  const results = [];
  if (bdDelay) {
    const callers = (await readLines(join(dir, BD_CALLS_FILE))).map((firstArg) =>
      firstArg === "--sandbox" ? "server" : firstArg === "hooks" ? "hook" : "fixture",
    );
    const count = (caller: string) => callers.filter((each) => each === caller).length;
    results.push(
      `bd 지연 wrapper를 거친 bd 실행 서버 ${count("server")}번, fixture ${count("fixture")}번, git hook ${count("hook")}번`,
    );
  }
  if (cpuThrottleRate) {
    const pages = await readLines(join(dir, THROTTLED_PAGES_FILE));
    results.push(`CPU ${cpuThrottleRate}배 제한을 적용한 page ${pages.length}개`);
  }
  return results.join(", ");
}

async function readLines(path: string): Promise<string[]> {
  try {
    return (await readFile(path, "utf8")).split("\n").filter(Boolean);
  } catch {
    return [];
  }
}
