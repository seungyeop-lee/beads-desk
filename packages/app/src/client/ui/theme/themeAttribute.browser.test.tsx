import { expect, onTestFinished, test } from "vitest";
import { commands } from "vitest/browser";
import type { ThemeChoice } from "@/shared/contract/theme";
import { themeAttribute } from "./themeAttribute";

// vitest.browser.config.ts의 browser.commands에 둔 명령입니다.
declare module "vitest/browser" {
  interface BrowserCommands {
    emulateColorScheme: (colorScheme: "light" | "dark" | null) => Promise<void>;
  }
}

test.each<[ThemeChoice, "light" | "dark", "light" | "dark"]>([
  ["light", "dark", "light"],
  ["dark", "light", "dark"],
  ["system", "light", "light"],
  ["system", "dark", "dark"],
])("테마 선택이 %s이고 운영체제가 %s 모드이면 %s 테마가 적용된다", async (theme, os, applied) => {
  const html = document.documentElement;
  onTestFinished(async () => {
    html.removeAttribute("data-theme");
    await commands.emulateColorScheme(null);
  });
  await commands.emulateColorScheme(os);

  // layout이 첫 HTML의 `<html>`에 넣는 것과 같은 속성을 넣습니다.
  const attribute = themeAttribute(theme);
  if (attribute === undefined) html.removeAttribute("data-theme");
  else html.setAttribute("data-theme", attribute);

  expect(getComputedStyle(html).colorScheme).toBe(applied);
});
