import { describe, expect, test } from "vitest";
import { bdVersion } from "./bdVersion";
import { fakeBdWorkspace } from "./fakeBd.testkit";

const fakeBd = fakeBdWorkspace("beads-desk-bd-version-");
const { useFakeBd } = fakeBd;

describe("bdVersion", () => {
  test("bd version 출력의 앞뒤 공백을 지워 돌려준다", async () => {
    await useFakeBd({
      version: { stdout: "\nbd version 1.3.1 (Homebrew)\n" },
    });

    expect(await bdVersion(fakeBd.workDir)).toBe("bd version 1.3.1 (Homebrew)");
  });

  test("bd 실행이 실패하면 null을 돌려준다", async () => {
    await useFakeBd({
      version: { stderr: "boom", code: 1 },
    });

    expect(await bdVersion(fakeBd.workDir)).toBeNull();
  });
});
