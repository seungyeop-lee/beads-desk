import { chmod, mkdtemp, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { runBd } from "./runBd";

let workDir: string;
const originalBdBin = process.env.BD_BIN;

beforeEach(async () => {
  workDir = await realpath(await mkdtemp(join(tmpdir(), "beads-desk-bd-")));
  const fakeBd = join(workDir, "fake-bd");
  await writeFile(
    fakeBd,
    '#!/bin/sh\necho "cwd=$(pwd) args=$*"\necho "stderr line" >&2\nexit "${FAKE_BD_EXIT:-0}"\n',
  );
  await chmod(fakeBd, 0o755);
  process.env.BD_BIN = fakeBd;
});

afterEach(() => {
  process.env.BD_BIN = originalBdBin;
  delete process.env.FAKE_BD_EXIT;
});

describe("runBd", () => {
  test("지정한 cwd에서 bd를 실행하고 출력을 돌려준다", async () => {
    const result = await runBd(["list", "--json"], { cwd: workDir });

    expect(result).toEqual({
      code: 0,
      stdout: `cwd=${workDir} args=list --json\n`,
      stderr: "stderr line\n",
    });
  });

  test("bd의 종료 코드를 그대로 돌려준다", async () => {
    process.env.FAKE_BD_EXIT = "3";

    const result = await runBd(["show", "x"], { cwd: workDir });

    expect(result.code).toBe(3);
  });

  test("bd 실행 파일이 없으면 종료 코드 127을 돌려준다", async () => {
    process.env.BD_BIN = join(workDir, "missing-bd");

    const result = await runBd(["list"], { cwd: workDir });

    expect(result.code).toBe(127);
  });
});
