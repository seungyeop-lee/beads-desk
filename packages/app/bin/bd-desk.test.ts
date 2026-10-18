import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const BIN_DIR = dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(readFileSync(resolve(BIN_DIR, "..", "package.json"), "utf8")) as {
  version: string;
};

test.each(["--version", "-v"])(
  "%s는 package.json의 version을 출력하고 종료 코드 0으로 끝난다",
  (flag) => {
    const result = spawnSync(process.execPath, [resolve(BIN_DIR, "bd-desk.js"), flag], {
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe(`${version}\n`);
  },
);
