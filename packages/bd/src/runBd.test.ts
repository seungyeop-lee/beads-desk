import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { fakeBdWorkspace } from "./fakeBd.testkit";
import { runBd, runBdChecked } from "./runBd";

const fakeBd = fakeBdWorkspace("beads-desk-bd-");
const { useFakeBdScript: useFakeBd } = fakeBd;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("runBd", () => {
  test("지정한 cwd에서 --sandbox를 붙여 bd를 실행하고 출력을 돌려준다", async () => {
    await useFakeBd('echo "cwd=$(pwd) args=$*"\necho "stderr line" >&2');

    const result = await runBd(["list", "--json"], { cwd: fakeBd.workDir });

    expect(result).toEqual({
      code: 0,
      stdout: `cwd=${fakeBd.workDir} args=--sandbox list --json\n`,
      stderr: "stderr line\n",
    });
  });

  test("bd의 종료 코드를 그대로 돌려준다", async () => {
    await useFakeBd("exit 3");

    const result = await runBd(["show", "x"], { cwd: fakeBd.workDir });

    expect(result.code).toBe(3);
  });

  test("bd가 signal로 종료되면 셸 관례대로 128에 signal 번호를 더한 종료 코드를 돌려준다", async () => {
    await useFakeBd("kill -KILL $$");

    const result = await runBd(["list"], { cwd: fakeBd.workDir });

    expect(result.code).toBe(137);
  });

  test("bd 실행 파일이 없으면 종료 코드 127과 실행 오류 메시지를 돌려준다", async () => {
    vi.stubEnv("BD_BIN", join(fakeBd.workDir, "missing-bd"));

    const result = await runBd(["list"], { cwd: fakeBd.workDir });

    expect(result.code).toBe(127);
    expect(result.stderr).toContain("ENOENT");
  });

  test("Windows에서 실행할 bd.exe를 찾지 못하면 bd를 실행하지 않고 종료 코드 127과 BD_BIN 안내를 돌려준다", async () => {
    const platform = Object.getOwnPropertyDescriptor(process, "platform")!;
    Object.defineProperty(process, "platform", { ...platform, value: "win32" });
    vi.stubEnv("BD_BIN", "");
    vi.stubEnv("PATH", fakeBd.workDir);

    try {
      const result = await runBd(["list"], { cwd: fakeBd.workDir });

      expect(result.code).toBe(127);
      expect(result.stderr).toContain("Set BD_BIN to the full path of bd.exe");
    } finally {
      Object.defineProperty(process, "platform", platform);
    }
  });

  test("실행할 디렉터리가 없으면 bd가 없다는 오류 대신 디렉터리가 없다고 알린다", async () => {
    await useFakeBd("echo ok");
    const missing = join(fakeBd.workDir, "deleted-workspace");

    const result = await runBd(["list"], { cwd: missing });

    expect(result).toEqual({
      code: 127,
      stdout: "",
      stderr: `workspace directory does not exist: ${missing}`,
    });
  });

  test("동시에 요청해도 bd를 한 번에 하나씩 실행한다", async () => {
    const log = join(fakeBd.workDir, "runs.log");
    await useFakeBd(`echo start >> "${log}"\nsleep 0.1\necho end >> "${log}"`);

    await Promise.all([
      runBd(["list"], { cwd: fakeBd.workDir }),
      runBd(["ready"], { cwd: fakeBd.workDir }),
      runBd(["blocked"], { cwd: fakeBd.workDir }),
    ]);

    expect(await readFile(log, "utf8")).toBe("start\nend\nstart\nend\nstart\nend\n");
  });

  test("기다리는 쓰기를 기다리는 읽기보다 먼저 실행한다", async () => {
    const log = join(fakeBd.workDir, "runs.log");
    await useFakeBd(`echo "$2" >> "${log}"\nsleep 0.1`);

    await Promise.all([
      runBd(["show"], { cwd: fakeBd.workDir }),
      runBd(["list"], { cwd: fakeBd.workDir }),
      runBd(["update"], { cwd: fakeBd.workDir, write: true }),
      runBd(["ready"], { cwd: fakeBd.workDir }),
      runBd(["close"], { cwd: fakeBd.workDir, write: true }),
    ]);

    expect(await readFile(log, "utf8")).toBe("show\nupdate\nclose\nlist\nready\n");
  });

  test("변경 감시 읽기를 화면 조회보다 먼저, 쓰기보다는 뒤에 실행한다", async () => {
    const log = join(fakeBd.workDir, "runs.log");
    await useFakeBd(`echo "$2" >> "${log}"\nsleep 0.1`);

    await Promise.all([
      runBd(["show"], { cwd: fakeBd.workDir }),
      runBd(["list"], { cwd: fakeBd.workDir }),
      runBd(["update"], { cwd: fakeBd.workDir, write: true }),
      runBd(["sql"], { cwd: fakeBd.workDir, watch: true }),
      runBd(["ready"], { cwd: fakeBd.workDir }),
      runBd(["close"], { cwd: fakeBd.workDir, write: true }),
    ]);

    expect(await readFile(log, "utf8")).toBe("show\nupdate\nclose\nsql\nlist\nready\n");
  });

  test("기다리는 화면 조회와 같은 조회는 bd를 다시 실행하지 않고 같은 결과를 받는다", async () => {
    const log = join(fakeBd.workDir, "runs.log");
    await useFakeBd(`echo "$2" >> "${log}"\nsleep 0.1\necho "$2 result"`);
    const running = runBd(["show"], { cwd: fakeBd.workDir });

    const [first, second] = await Promise.all([
      runBd(["list"], { cwd: fakeBd.workDir }),
      runBd(["list"], { cwd: fakeBd.workDir }),
    ]);
    await running;

    expect(await readFile(log, "utf8")).toBe("show\nlist\n");
    expect(first.stdout).toBe("list result\n");
    expect(second.stdout).toBe("list result\n");
  });

  test("이미 실행을 시작한 같은 조회에는 붙지 않고 bd를 다시 실행한다", async () => {
    const log = join(fakeBd.workDir, "runs.log");
    await useFakeBd(`echo "$2" >> "${log}"\nsleep 0.1`);

    // 큐가 비어 있으므로 첫 조회는 요청과 동시에 실행을 시작합니다.
    await Promise.all([
      runBd(["list"], { cwd: fakeBd.workDir }),
      runBd(["list"], { cwd: fakeBd.workDir }),
    ]);

    expect(await readFile(log, "utf8")).toBe("list\nlist\n");
  });

  test("같은 쓰기가 여러 번 기다리고 있으면 모두 실행한다", async () => {
    const log = join(fakeBd.workDir, "runs.log");
    await useFakeBd(`echo "$2" >> "${log}"\nsleep 0.1`);

    await Promise.all([
      runBd(["show"], { cwd: fakeBd.workDir }),
      runBd(["update"], { cwd: fakeBd.workDir, write: true }),
      runBd(["update"], { cwd: fakeBd.workDir, write: true }),
    ]);

    expect(await readFile(log, "utf8")).toBe("show\nupdate\nupdate\n");
  });

  test("하나로 합친 조회는 시작하기 전에 들어온 쓰기를 반영한 값을 모두에게 돌려준다", async () => {
    const state = join(fakeBd.workDir, "state");
    const log = join(fakeBd.workDir, "runs.log");
    await writeFile(state, "before\n");
    await useFakeBd(
      `echo "$2" >> "${log}"
if [ "$2" = "update" ]; then echo after > "${state}"; exit 0; fi
sleep 0.1
cat "${state}"`,
    );

    const [, first, second] = await Promise.all([
      runBd(["show"], { cwd: fakeBd.workDir }),
      runBd(["list"], { cwd: fakeBd.workDir }),
      runBd(["list"], { cwd: fakeBd.workDir }),
      runBd(["update"], { cwd: fakeBd.workDir, write: true }),
    ]);

    expect(await readFile(log, "utf8")).toBe("show\nupdate\nlist\n");
    expect(first.stdout).toBe("after\n");
    expect(second.stdout).toBe("after\n");
  });

  test("Dolt 서버에 연결하지 못하면 bd dolt start 후 한 번 다시 실행한다", async () => {
    const started = join(fakeBd.workDir, "dolt-started");
    await useFakeBd(
      [
        'if [ "$2" = "dolt" ] && [ "$3" = "start" ]; then touch "' + started + '"; exit 0; fi',
        'if [ ! -f "' +
          started +
          '" ]; then echo "Dolt server unreachable at 127.0.0.1:3308" >&2; exit 1; fi',
        "echo ok",
      ].join("\n"),
    );

    const result = await runBd(["list"], { cwd: fakeBd.workDir });

    expect(result).toMatchObject({ code: 0, stdout: "ok\n" });
  });

  test("같은 workspace에서 bd dolt start가 실패하면 잠시 다시 시도하지 않는다", async () => {
    const attempts = join(fakeBd.workDir, "dolt-attempts.log");
    await useFakeBd(
      [
        'if [ "$2" = "dolt" ] && [ "$3" = "start" ]; then echo attempt >> "' +
          attempts +
          '"; exit 1; fi',
        'echo "Dolt server unreachable at 127.0.0.1:3308" >&2',
        "exit 1",
      ].join("\n"),
    );

    const first = await runBd(["list"], { cwd: fakeBd.workDir });
    const second = await runBd(["list"], { cwd: fakeBd.workDir });

    expect([first.code, second.code]).toEqual([1, 1]);
    expect(await readFile(attempts, "utf8")).toBe("attempt\n");
  });

  test("셸에서 물려받은 bd 설정 가운데 출력 형태와 DB 위치를 바꾸는 값은 고치고, 나머지는 그대로 넘긴다", async () => {
    await useFakeBd(
      [
        'echo "envelope=$BD_JSON_ENVELOPE json=$BD_JSON"',
        'echo "dir=${BEADS_DIR-unset} db=${BEADS_DB-unset} bd_db=${BD_DB-unset}"',
        'echo "readonly=$BD_READONLY actor=$BEADS_ACTOR"',
      ].join("\n"),
    );
    vi.stubEnv("BD_JSON_ENVELOPE", "1");
    vi.stubEnv("BD_JSON", "true");
    vi.stubEnv("BEADS_DIR", "/elsewhere/.beads");
    vi.stubEnv("BEADS_DB", "/elsewhere/beads.db");
    vi.stubEnv("BD_DB", "/elsewhere/beads.db");
    vi.stubEnv("BD_READONLY", "true");
    vi.stubEnv("BEADS_ACTOR", "someone");

    const result = await runBd(["list"], { cwd: fakeBd.workDir });

    expect(result.stdout).toBe(
      "envelope=0 json=false\ndir=unset db=unset bd_db=unset\nreadonly=true actor=someone\n",
    );
  });
});

describe("runBdChecked", () => {
  test("--json 명령이 stderr 없이 stdout의 error 필드로 실패를 알리면 그 내용을 오류 메시지로 쓴다", async () => {
    await useFakeBd(
      `echo '{"error": "validation failed: invalid issue type: nope", "schema_version": 1}'\nexit 1`,
    );

    const result = await runBdChecked(fakeBd.workDir, ["create", "--json"]);

    expect(result).toEqual({
      ok: false,
      error: { message: "validation failed: invalid issue type: nope", exitCode: 1 },
    });
  });

  test("실패 이유를 어디서도 찾지 못하면 종료 코드를 알린다", async () => {
    await useFakeBd("echo not-json\nexit 2");

    const result = await runBdChecked(fakeBd.workDir, ["list"]);

    expect(result).toEqual({
      ok: false,
      error: { message: "bd exited with code 2.", exitCode: 2 },
    });
  });
});
