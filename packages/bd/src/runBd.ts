import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { constants } from "node:os";
import { isRecord } from "./issue";

export type BdResult = {
  code: number;
  stdout: string;
  stderr: string;
};

export type RunBdOptions = {
  cwd: string;
  /** 쓰기 명령이면 true입니다. 기다리는 읽기보다 먼저 실행합니다. */
  write?: boolean;
};

export type BdError = {
  message: string;
  /** 입력이 잘못되어 bd를 실행하지 않았으면 null입니다. */
  exitCode: number | null;
};

export type BdOutcome<T> = { ok: true; value: T } | { ok: false; error: BdError };

/** 실행 파일을 찾지 못했을 때 셸과 같은 종료 코드를 돌려줍니다. */
const SPAWN_FAILURE_CODE = 127;
const DOLT_UNREACHABLE = /Dolt server unreachable/i;
/** 계속 실패하는 Dolt 서버를 요청마다 다시 시작하지 않도록 workspace별로 기다리는 시간입니다. */
const DOLT_START_COOLDOWN_MS = 30_000;

/**
 * bd를 실행합니다. 같은 process 안의 모든 호출은 한 번에 하나씩 실행되고, 기다리는 쓰기가 기다리는 읽기보다 먼저 실행됩니다.
 * server mode workspace의 Dolt 서버가 꺼져 있으면 `bd dolt start`로 켜고 한 번 다시 실행합니다.
 */
export function runBd(args: string[], options: RunBdOptions): Promise<BdResult> {
  return serialized(async () => {
    const result = await spawnBd(args, options.cwd);
    if (
      result.code !== 0 &&
      DOLT_UNREACHABLE.test(result.stderr) &&
      (await startDoltServer(options.cwd))
    ) {
      return spawnBd(args, options.cwd);
    }
    return result;
  }, options.write ?? false);
}

type BdProcessState = {
  writes: (() => Promise<void>)[];
  reads: (() => Promise<void>)[];
  running: boolean;
  lastDoltStartAt: Map<string, number>;
};

// bd를 동시에 실행하면 같은 workspace의 Dolt가 손상될 수 있어 실행을 process 전체에서 직렬화합니다.
// 화면은 쓰기가 끝날 때마다 다시 조회하므로, 쓰기가 읽기 뒤에 줄 서면 연달아 고친 값이 몇 초씩 늦게 저장됩니다.
// 이 module은 instrumentation과 route handler에 서로 다른 사본으로 들어가므로 상태를 globalThis에 둡니다.
const PROCESS_STATE_KEY = Symbol.for("beads-desk.bd.processState");

function processState(): BdProcessState {
  const holder = globalThis as { [PROCESS_STATE_KEY]?: BdProcessState };
  holder[PROCESS_STATE_KEY] ??= {
    writes: [],
    reads: [],
    running: false,
    lastDoltStartAt: new Map(),
  };
  return holder[PROCESS_STATE_KEY];
}

function serialized<T>(operation: () => Promise<T>, write: boolean): Promise<T> {
  const state = processState();
  return new Promise<T>((resolve, reject) => {
    (write ? state.writes : state.reads).push(() => operation().then(resolve, reject));
    void drain(state);
  });
}

async function drain(state: BdProcessState): Promise<void> {
  if (state.running) return;
  state.running = true;
  try {
    for (let next = nextJob(state); next; next = nextJob(state)) await next();
  } finally {
    state.running = false;
  }
}

function nextJob(state: BdProcessState): (() => Promise<void>) | undefined {
  return state.writes.shift() ?? state.reads.shift();
}

async function startDoltServer(cwd: string): Promise<boolean> {
  const { lastDoltStartAt } = processState();
  const now = Date.now();
  if (now - (lastDoltStartAt.get(cwd) ?? 0) < DOLT_START_COOLDOWN_MS) {
    return false;
  }
  lastDoltStartAt.set(cwd, now);
  const result = await spawnBd(["dolt", "start"], cwd);
  return result.code === 0;
}

// 대화형 UI 요청마다 Dolt auto-push가 일어나지 않도록 항상 sandbox mode로 실행합니다.
function spawnBd(args: string[], cwd: string): Promise<BdResult> {
  return new Promise((resolve) => {
    // spawn을 정적 분석하면 Turbopack이 프로젝트 전체를 server 출력 추적 대상에 넣습니다.
    const child = spawn(/*turbopackIgnore: true*/ bdBin(), ["--sandbox", ...args], {
      cwd,
      shell: false,
      windowsHide: true,
    });
    const stdout: string[] = [];
    const stderr: string[] = [];
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => stdout.push(chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => stderr.push(chunk));

    child.on("error", (error) =>
      resolve({ code: SPAWN_FAILURE_CODE, stdout: "", stderr: spawnErrorMessage(error, cwd) }),
    );
    child.on("close", (code, signal) =>
      resolve({
        code: code ?? signalExitCode(signal),
        stdout: stdout.join(""),
        stderr: stderr.join(""),
      }),
    );
  });
}

// cwd가 없을 때도 Node는 bd 실행 파일을 찾지 못했을 때와 같은 ENOENT를 냅니다.
function spawnErrorMessage(error: NodeJS.ErrnoException, cwd: string): string {
  return error.code === "ENOENT" && !existsSync(cwd)
    ? `workspace 디렉터리가 없습니다: ${cwd}`
    : error.message;
}

// signal로 종료되면 Node는 종료 코드를 null로 넘깁니다. 셸처럼 128 + signal 번호로 바꿔 실패로 다룹니다.
function signalExitCode(signal: NodeJS.Signals | null): number {
  return 128 + (signal ? constants.signals[signal] : 0);
}

function bdBin(): string {
  return process.env.BD_BIN || "bd";
}

/** bd를 실행하고 JSON 출력을 해석합니다. */
export async function runBdJson(
  cwd: string,
  args: string[],
  options: Omit<RunBdOptions, "cwd"> = {},
): Promise<BdOutcome<unknown>> {
  const result = await runBdChecked(cwd, args, options);
  if (!result.ok) {
    return result;
  }
  try {
    return { ok: true, value: JSON.parse(result.value) };
  } catch {
    return {
      ok: false,
      error: { message: "bd 출력을 JSON으로 해석하지 못했습니다.", exitCode: 0 },
    };
  }
}

/** bd를 실행하고, 실패하면 bd가 남긴 실패 이유를 오류 메시지로 돌려줍니다. 성공하면 stdout을 돌려줍니다. */
export async function runBdChecked(
  cwd: string,
  args: string[],
  options: Omit<RunBdOptions, "cwd"> = {},
): Promise<BdOutcome<string>> {
  const result = await runBd(args, { cwd, ...options });
  if (result.code !== 0) {
    const message =
      (result.stderr.trim() ? result.stderr : jsonError(result.stdout)) ??
      `bd가 종료 코드 ${result.code}로 실패했습니다.`;
    return { ok: false, error: { message, exitCode: result.code } };
  }
  return { ok: true, value: result.stdout };
}

// bd create --json 같은 명령은 실패 이유를 stderr가 아니라 stdout의 {"error": ...}로 출력합니다.
function jsonError(stdout: string): string | null {
  try {
    const output: unknown = JSON.parse(stdout);
    return isRecord(output) && typeof output.error === "string" ? output.error : null;
  } catch {
    return null;
  }
}

/** 입력이 잘못되어 bd를 실행하지 않은 오류입니다. */
export function inputError(message: string): { ok: false; error: BdError } {
  return { ok: false, error: { message, exitCode: null } };
}
