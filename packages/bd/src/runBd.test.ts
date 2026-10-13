import { chmod, mkdtemp, readFile, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { runBd } from "./runBd";

let workDir: string;
const originalBdBin = process.env.BD_BIN;

beforeEach(async () => {
  workDir = await realpath(await mkdtemp(join(tmpdir(), "beads-desk-bd-")));
});

afterEach(() => {
  process.env.BD_BIN = originalBdBin;
});

/** 주어진 셸 본문을 실행하는 가짜 bd를 만들고 BD_BIN으로 지정합니다. */
async function useFakeBd(body: string): Promise<void> {
  const fakeBd = join(workDir, "fake-bd");
  await writeFile(fakeBd, `#!/bin/sh\n${body}\n`);
  await chmod(fakeBd, 0o755);
  process.env.BD_BIN = fakeBd;
}

describe("runBd", () => {
  test("지정한 cwd에서 --sandbox를 붙여 bd를 실행하고 출력을 돌려준다", async () => {
    await useFakeBd('echo "cwd=$(pwd) args=$*"\necho "stderr line" >&2');

    const result = await runBd(["list", "--json"], { cwd: workDir });

    expect(result).toEqual({
      code: 0,
      stdout: `cwd=${workDir} args=--sandbox list --json\n`,
      stderr: "stderr line\n",
    });
  });

  test("bd의 종료 코드를 그대로 돌려준다", async () => {
    await useFakeBd("exit 3");

    const result = await runBd(["show", "x"], { cwd: workDir });

    expect(result.code).toBe(3);
  });

  test("bd가 signal로 종료되면 셸 관례대로 128에 signal 번호를 더한 종료 코드를 돌려준다", async () => {
    await useFakeBd("kill -KILL $$");

    const result = await runBd(["list"], { cwd: workDir });

    expect(result.code).toBe(137);
  });

  test("bd 실행 파일이 없으면 종료 코드 127을 돌려준다", async () => {
    process.env.BD_BIN = join(workDir, "missing-bd");

    const result = await runBd(["list"], { cwd: workDir });

    expect(result.code).toBe(127);
  });

  test("동시에 요청해도 bd를 한 번에 하나씩 실행한다", async () => {
    const log = join(workDir, "runs.log");
    await useFakeBd(`echo start >> "${log}"\nsleep 0.1\necho end >> "${log}"`);

    await Promise.all([
      runBd(["list"], { cwd: workDir }),
      runBd(["ready"], { cwd: workDir }),
      runBd(["blocked"], { cwd: workDir }),
    ]);

    expect(await readFile(log, "utf8")).toBe("start\nend\nstart\nend\nstart\nend\n");
  });

  test("Dolt 서버에 연결하지 못하면 bd dolt start 후 한 번 다시 실행한다", async () => {
    const started = join(workDir, "dolt-started");
    await useFakeBd(
      [
        'if [ "$2" = "dolt" ] && [ "$3" = "start" ]; then touch "' + started + '"; exit 0; fi',
        'if [ ! -f "' +
          started +
          '" ]; then echo "Dolt server unreachable at 127.0.0.1:3308" >&2; exit 1; fi',
        "echo ok",
      ].join("\n"),
    );

    const result = await runBd(["list"], { cwd: workDir });

    expect(result).toMatchObject({ code: 0, stdout: "ok\n" });
  });

  test("같은 workspace에서 bd dolt start가 실패하면 잠시 다시 시도하지 않는다", async () => {
    const attempts = join(workDir, "dolt-attempts.log");
    await useFakeBd(
      [
        'if [ "$2" = "dolt" ] && [ "$3" = "start" ]; then echo attempt >> "' +
          attempts +
          '"; exit 1; fi',
        'echo "Dolt server unreachable at 127.0.0.1:3308" >&2',
        "exit 1",
      ].join("\n"),
    );

    const first = await runBd(["list"], { cwd: workDir });
    const second = await runBd(["list"], { cwd: workDir });

    expect([first.code, second.code]).toEqual([1, 1]);
    expect(await readFile(attempts, "utf8")).toBe("attempt\n");
  });
});
