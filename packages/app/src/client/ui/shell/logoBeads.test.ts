import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";
import { LOGO_BEADS } from "./logoBeads";

test("구슬의 hex 색은 theme.css에서 같은 tone 이름의 색과 같다", async () => {
  const theme = await readFile(
    new URL("../designSystem/styles/theme.css", import.meta.url),
    "utf8",
  );
  for (const { tone, color } of LOGO_BEADS) {
    const name = tone.replace("tone-", "");
    expect(theme).toContain(`--color-${name}: ${color};`);
  }
});
