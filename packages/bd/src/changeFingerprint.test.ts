import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { openChangeFingerprint } from "./changeFingerprint";
import { fakeBdWorkspace } from "./fakeBd.testkit";

const fakeBd = fakeBdWorkspace("beads-desk-change-fingerprint-");
const { useFakeBd } = fakeBd;

describe("openChangeFingerprint", () => {
  const doltShow = "dolt show --json";
  const hashQuery = "sql SELECT DOLT_HASHOF_DB() AS h --json";

  test("embedded mode에서는 Dolt manifest 내용을 읽는다", async () => {
    const noms = join(fakeBd.workDir, "embeddeddolt", "demo", ".dolt", "noms");
    await mkdir(noms, { recursive: true });
    await writeFile(join(noms, "manifest"), "root-1");
    await useFakeBd({
      [doltShow]: {
        stdout: JSON.stringify({
          embedded: true,
          data_dir: join(fakeBd.workDir, "embeddeddolt"),
          database: "demo",
        }),
      },
    });

    const result = await openChangeFingerprint(fakeBd.workDir);
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    const before = await result.value();
    await writeFile(join(noms, "manifest"), "root-2");

    expect([before, await result.value()]).toEqual(["root-1", "root-2"]);
  });

  test("server mode에서는 Dolt DB hash를 조회한다", async () => {
    await useFakeBd({
      [doltShow]: { stdout: JSON.stringify({ embedded: false, database: "demo" }) },
      [hashQuery]: { stdout: JSON.stringify([{ h: "hash-1" }]) },
    });

    const result = await openChangeFingerprint(fakeBd.workDir);
    if (!result.ok) throw new Error(JSON.stringify(result.error));

    expect(await result.value()).toBe("hash-1");
  });

  test("값을 읽지 못하면 null을 돌려준다", async () => {
    await useFakeBd({
      [doltShow]: { stdout: JSON.stringify({ embedded: false, database: "demo" }) },
      [hashQuery]: { stderr: "boom", code: 1 },
    });

    const result = await openChangeFingerprint(fakeBd.workDir);
    if (!result.ok) throw new Error(JSON.stringify(result.error));

    expect(await result.value()).toBeNull();
  });

  test("Dolt 설정을 읽지 못하면 오류를 돌려준다", async () => {
    await useFakeBd({ [doltShow]: { stderr: "no beads workspace", code: 1 } });

    const result = await openChangeFingerprint(fakeBd.workDir);

    expect(result).toEqual({
      ok: false,
      error: { message: "no beads workspace\n", exitCode: 1 },
    });
  });
});
