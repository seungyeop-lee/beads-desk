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
  /** 변경 감시가 DB 상태를 읽는 실행이면 true입니다. 화면 조회보다 먼저 실행하고, 대기 중인 쓰기보다는 뒤에 실행합니다. */
  watch?: boolean;
};

/** bd가 실패하며 남긴 이유나 bd를 실행하지 못한 이유입니다. 번역하지 않은 원문을 담습니다. */
export type BdCommandError = { message: string; exitCode: number };

/**
 * adapter가 입력이나 bd 출력을 보고 판단한 오류입니다. 문구를 담지 않으므로, 사람에게 보일 문구는 쓰는 쪽이 kind로 골라 그 언어로 씁니다.
 * 입력이 잘못되어 bd를 실행하지 않았으면 exitCode는 null이고, bd는 성공했지만 출력을 해석하지 못했으면 0입니다.
 */
export type BdAdapterError = { kind: BdErrorKind; exitCode: null | 0 };

export type BdErrorKind =
  | "emptyTitle"
  | "noChanges"
  | "invalidDeferDate"
  | "emptyIssueId"
  | "emptyTargetId"
  | "emptyGateId"
  | "emptyComment"
  | "emptyResponse"
  | "emptyLabel"
  | "notAwaitingHumanDecision"
  | "emptyDescriptionSearch"
  | "invalidStaleDays"
  | "unparsableOutput"
  | "missingCreatedIssueId"
  | "missingShownIssue";

export type BdError = BdCommandError | BdAdapterError;

export type BdOutcome<T> = { ok: true; value: T } | { ok: false; error: BdError };

/** 실행 파일을 찾지 못했을 때 셸과 같은 종료 코드를 돌려줍니다. */
const SPAWN_FAILURE_CODE = 127;
const DOLT_UNREACHABLE = /Dolt server unreachable/i;
/** 계속 실패하는 Dolt 서버를 요청마다 다시 시작하지 않도록 workspace별로 기다리는 시간입니다. */
const DOLT_START_COOLDOWN_MS = 30_000;

/**
 * bd를 실행합니다. 같은 process 안의 모든 호출은 한 번에 하나씩 실행되고, 기다리는 실행은 쓰기, 변경 감시 읽기, 나머지 읽기 순서로 실행됩니다.
 * 같은 cwd와 인자의 화면 조회가 아직 시작하지 않은 채 기다리고 있으면, bd를 다시 실행하지 않고 그 조회의 결과를 함께 받습니다.
 * server mode workspace의 Dolt 서버가 꺼져 있으면 `bd dolt start`로 켜고 한 번 다시 실행합니다.
 */
export function runBd(args: string[], options: RunBdOptions): Promise<BdResult> {
  return serialized(args, options, async () => {
    const result = await spawnBd(args, options.cwd);
    if (
      result.code !== 0 &&
      DOLT_UNREACHABLE.test(result.stderr) &&
      (await startDoltServer(options.cwd))
    ) {
      return spawnBd(args, options.cwd);
    }
    return result;
  });
}

type BdProcessState = {
  writes: (() => Promise<void>)[];
  watchReads: (() => Promise<void>)[];
  reads: (() => Promise<void>)[];
  /** 아직 시작하지 않은 화면 조회의 결과입니다. 키는 cwd와 인자입니다. */
  waitingReads: Map<string, Promise<BdResult>>;
  running: boolean;
  lastDoltStartAt: Map<string, number>;
};

// bd를 동시에 실행하면 같은 workspace의 Dolt가 손상될 수 있어 실행을 process 전체에서 직렬화합니다.
// 화면은 쓰기가 끝날 때마다 다시 조회하므로, 쓰기가 읽기 뒤에 줄 서면 연달아 고친 값이 몇 초씩 늦게 저장됩니다.
// 변경 감시 읽기는 화면 조회보다 먼저 실행합니다. 조회가 쌓여 있는 동안에는 invalidate가 그만큼 늦어지기 때문입니다.
// 기다리는 같은 화면 조회는 한 번만 실행합니다. invalidate 하나에 열린 탭마다 같은 조회를 다시 요청하므로,
// 따로 실행하면 탭 수만큼 같은 bd 실행이 줄을 서서 마지막 탭의 화면이 그만큼 늦게 바뀝니다.
// 이 module은 instrumentation과 route handler에 서로 다른 사본으로 들어가므로 상태를 globalThis에 둡니다.
const PROCESS_STATE_KEY = Symbol.for("beads-desk.bd.processState");

function processState(): BdProcessState {
  const holder = globalThis as { [PROCESS_STATE_KEY]?: BdProcessState };
  holder[PROCESS_STATE_KEY] ??= {
    writes: [],
    watchReads: [],
    reads: [],
    waitingReads: new Map(),
    running: false,
    lastDoltStartAt: new Map(),
  };
  return holder[PROCESS_STATE_KEY];
}

function serialized(
  args: string[],
  options: RunBdOptions,
  operation: () => Promise<BdResult>,
): Promise<BdResult> {
  const state = processState();
  if (options.write || options.watch) {
    return new Promise((resolve, reject) => {
      const queue = options.write ? state.writes : state.watchReads;
      queue.push(() => operation().then(resolve, reject));
      void drain(state);
    });
  }

  // 이미 시작한 조회는 이 호출보다 먼저 끝난 쓰기를 읽지 못했을 수 있어 붙지 않습니다.
  // 아직 시작하지 않은 조회는 이 호출 뒤에 시작하고 기다리는 쓰기도 그보다 먼저 실행되므로, 붙어도 새 값을 받습니다.
  const key = JSON.stringify([options.cwd, ...args]);
  const waiting = state.waitingReads.get(key);
  if (waiting) return waiting;

  const { promise, resolve, reject } = Promise.withResolvers<BdResult>();
  state.waitingReads.set(key, promise);
  state.reads.push(() => {
    state.waitingReads.delete(key);
    return operation().then(resolve, reject);
  });
  void drain(state);
  return promise;
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
  return state.writes.shift() ?? state.watchReads.shift() ?? state.reads.shift();
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
      env: bdEnv(),
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
    ? `workspace directory does not exist: ${cwd}`
    : error.message;
}

// signal로 종료되면 Node는 종료 코드를 null로 넘깁니다. 셸처럼 128 + signal 번호로 바꿔 실패로 다룹니다.
function signalExitCode(signal: NodeJS.Signals | null): number {
  return 128 + (signal ? constants.signals[signal] : 0);
}

/** 호출한 쪽이 cwd로 정한 workspace 대신 다른 DB를 bd가 열게 하는 변수입니다. bd는 `BEADS_DIR`가 있으면 cwd의 `.beads`를 쓰지 않습니다. */
const DB_LOCATION_ENV = ["BEADS_DIR", "BEADS_DB", "BD_DB"];

// bd는 설정 key마다 `BD_<KEY>` 환경 변수를 읽으므로, 사용자가 셸에 export한 bd 설정이 서버를 거쳐 bd까지 전달됩니다.
// 그중 adapter가 해석하는 출력 형태를 바꾸는 값은 고정하고, 다른 DB를 가리키는 값은 지웁니다.
// `BD_READONLY`, `BEADS_ACTOR`, Dolt 서버 접속 정보처럼 사용자가 의도해서 둔 설정은 그대로 넘깁니다.
function bdEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    // `BD_JSON_ENVELOPE=1`이면 `--json` 출력이 `{"data": ...}`로 감싸져, adapter가 이슈를 하나도 찾지 못합니다.
    BD_JSON_ENVELOPE: "0",
    // json 설정이 켜지면 `--json`을 주지 않은 `bd version`도 JSON을 출력합니다.
    // 지우지 않고 false로 두어야 workspace의 config.yaml에서 켠 값까지 덮어씁니다. 명령에 준 `--json`은 이 값보다 우선합니다.
    BD_JSON: "false",
  };
  for (const key of DB_LOCATION_ENV) delete env[key];
  return env;
}

/** 실행할 bd를 고르는 규칙입니다. e2e fixture가 서버와 같은 bd를 실행하도록 이 규칙을 가져가 씁니다. */
export function bdBin(): string {
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
    return outputError("unparsableOutput");
  }
}

/** bd를 실행하고, 실패하면 bd가 남긴 실패 이유를 오류 메시지로 돌려줍니다. 성공하면 stdout을 돌려줍니다. */
export async function runBdChecked(
  cwd: string,
  args: string[],
  options: Omit<RunBdOptions, "cwd"> = {},
): Promise<{ ok: true; value: string } | { ok: false; error: BdCommandError }> {
  const result = await runBd(args, { cwd, ...options });
  if (result.code !== 0) {
    const message =
      (result.stderr.trim() ? result.stderr : jsonError(result.stdout)) ??
      `bd exited with code ${result.code}.`;
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
export function inputError(kind: BdErrorKind): { ok: false; error: BdAdapterError } {
  return { ok: false, error: { kind, exitCode: null } };
}

/** bd는 성공했지만 출력에서 기대한 값을 찾지 못한 오류입니다. */
export function outputError(kind: BdErrorKind): { ok: false; error: BdAdapterError } {
  return { ok: false, error: { kind, exitCode: 0 } };
}

// bd는 id를 빈 값으로 받으면 마지막으로 다룬 이슈를 대상으로 삼는 명령이 있어, 빈 id는 bd를 실행하지 않고 거부합니다.

/** id에서 앞뒤 공백을 제거한 값을 검사합니다. 비어 있으면 kind로 입력 오류를 돌려줍니다. */
export function trimmedId(id: string, kind: BdErrorKind): BdOutcome<string> {
  const trimmed = id.trim();
  return trimmed.length > 0 ? { ok: true, value: trimmed } : inputError(kind);
}

/** id마다 앞뒤 공백을 제거한 값을 검사합니다. 하나라도 비어 있으면 kind로 입력 오류를 돌려줍니다. */
export function trimmedIds(ids: string[], kind: BdErrorKind): BdOutcome<string[]> {
  const trimmed = ids.map((id) => id.trim());
  return trimmed.every((id) => id.length > 0) ? { ok: true, value: trimmed } : inputError(kind);
}
