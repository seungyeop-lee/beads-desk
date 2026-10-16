import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { Page, TestInfo } from "@playwright/test";
import { expect, test } from "../support/bdWorkspace";

test("에픽 순서 보기의 뒤로가기는 에픽 화면으로 돌아가며 두 언어에서 보인다", async ({
  page,
  workspace,
}, testInfo) => {
  await workspace.createIssues({
    epic: { title: "돌아갈 에픽", type: "epic" },
    first: { title: "에픽 작업", parent: "epic" },
  });
  await page.goto("/epics");
  await page
    .locator("section")
    .filter({ hasText: "돌아갈 에픽" })
    .getByRole("link", { name: "순서 보기" })
    .click();
  await expect(page.getByRole("dialog").getByRole("heading", { level: 1 })).toHaveText(
    "돌아갈 에픽 · 순서",
  );
  const back = page.getByRole("link", { name: "뒤로가기", exact: true });
  await expect(back).toHaveAttribute("href", "/epics");
  await capture(page, testInfo, "epic-back-ko");
  await changeLocale(page, "en");
  const englishBack = page.getByRole("link", { name: "Back", exact: true });
  await expect(englishBack).toBeVisible();
  await capture(page, testInfo, "epic-back-en");
  await englishBack.click();
  await expect(page).toHaveURL(/\/epics$/);
  await expect(page.locator("section").filter({ hasText: "돌아갈 에픽" })).toBeVisible();
});

test("상세의 조건과 옆 패널을 보존하고 그래프를 연달아 방문한 뒤 최초 화면까지 돌아간다", async ({
  page,
  workspace,
}, testInfo) => {
  const { first, second, last } = await workspace.createIssues(
    {
      first: { title: "복귀 첫째", type: "task" },
      second: { title: "복귀 둘째", type: "task" },
      last: { title: "복귀 마지막", type: "task" },
    },
    [
      ["second", "first"],
      ["last", "second"],
    ],
  );
  const origin = `/issues?view=blocked&type=task&date=created&from=2020-01-01&to=2099-12-31&issue=${second}&side=${first}`;
  await page.goto(origin);
  const originalDialog = page.getByRole("dialog", { name: `${second} 이슈` });
  await expect(page.getByRole("region", { name: `${first} 이슈 옆 패널` })).toBeVisible();
  await originalDialog.getByRole("link", { name: "선행·후속 그래프" }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { level: 1 })).toHaveText(
    "복귀 둘째 · 선행·후속",
  );
  await expect(page.getByRole("link", { name: "뒤로가기", exact: true })).toHaveAttribute(
    "href",
    origin,
  );
  await expect(
    page.getByRole("region", { name: "의존 그래프" }).getByRole("link", { name: /복귀 마지막/ }),
  ).toBeVisible();
  await capture(page, testInfo, "chain-back-ko");
  await changeLocale(page, "en");
  await expect(page.getByRole("link", { name: "Back", exact: true })).toBeVisible();
  await capture(page, testInfo, "chain-back-en");
  await changeLocale(page, "ko");

  await page
    .getByRole("region", { name: "의존 그래프" })
    .getByRole("link", { name: /복귀 마지막/ })
    .click();
  await expect(page.getByRole("region", { name: `${last} 이슈` })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL((url) => !url.searchParams.has("issue"));
  await page.reload();
  await expect(page.getByRole("link", { name: "뒤로가기", exact: true })).toHaveAttribute(
    "href",
    origin,
  );

  await page
    .getByRole("region", { name: "의존 그래프" })
    .getByRole("link", { name: /복귀 마지막/ })
    .click();
  await page
    .getByRole("region", { name: `${last} 이슈` })
    .getByRole("link", { name: "선행·후속 그래프" })
    .click();
  await expect(page.getByRole("dialog").getByRole("heading", { level: 1 })).toHaveText(
    "복귀 마지막 · 선행·후속",
  );
  await page.reload();
  await page.getByRole("link", { name: "뒤로가기", exact: true }).click();
  await expect(page).toHaveURL((url) => url.searchParams.get("center") === second);
  await expect(page.getByRole("region", { name: `${last} 이슈` })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog").getByRole("heading", { level: 1 })).toHaveText(
    "복귀 둘째 · 선행·후속",
  );
  await page.getByRole("link", { name: "뒤로가기", exact: true }).click();
  await expect(page).toHaveURL(origin);
  await expect(originalDialog).toBeVisible();
  await expect(page.getByRole("region", { name: `${first} 이슈 옆 패널` })).toBeVisible();
});

test("같은 그래프를 다시 열어도 자기 자신을 복귀 순서에 넣지 않는다", async ({
  page,
  workspace,
}) => {
  const { second } = await workspace.createIssues(
    { first: { title: "같은 그래프 앞" }, second: { title: "같은 그래프 기준" } },
    [["second", "first"]],
  );
  await page.goto(`/focus?issue=${second}`);
  await page
    .getByRole("dialog", { name: `${second} 이슈` })
    .getByRole("link", { name: "선행·후속 그래프" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("heading", { level: 1 })
    .getByRole("link", { name: "같은 그래프 기준" })
    .click();
  await page
    .getByRole("region", { name: `${second} 이슈` })
    .getByRole("link", { name: "선행·후속 그래프" })
    .click();
  const back = page.getByRole("link", { name: "뒤로가기", exact: true });
  await expect(back).toHaveAttribute("href", `/focus?issue=${second}`);
  await back.click();
  await expect(page).toHaveURL(`/focus?issue=${second}`);
  await expect(page.getByRole("dialog", { name: `${second} 이슈` })).toBeVisible();
});

test("직접 진입과 외부·손상된 복귀 정보는 그래프별 대체 화면으로 돌아간다", async ({
  page,
  workspace,
}) => {
  const { epic, second } = await workspace.createIssues(
    {
      epic: { title: "직접 여는 에픽", type: "epic" },
      first: { title: "직접 여는 선행", parent: "epic" },
      second: { title: "직접 여는 기준", parent: "epic" },
    },
    [["second", "first"]],
  );
  for (const [scope, id, fallback] of [
    ["epic", epic, "/epics"],
    ["center", second, `/issues?issue=${second}`],
  ]) {
    for (const invalid of [
      null,
      "https://example.com/issues",
      "//example.com/issues",
      "/api/issues",
      "/graph",
      "/issues?issue=%ZZ",
    ]) {
      const query = new URLSearchParams({ [scope!]: id! });
      if (invalid !== null) query.append("returnTo", invalid);
      await page.goto(`/graph?${query}`);
      const back = page.getByRole("link", { name: "뒤로가기", exact: true });
      await expect(back).toHaveAttribute("href", fallback!);
    }
    await page.getByRole("link", { name: "뒤로가기", exact: true }).click();
    await expect(page).toHaveURL(fallback!);
  }
});

async function capture(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`) });
  const directory = resolve(process.cwd(), "../../tmp/837-evidence");
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: resolve(directory, `${name}.png`) });
}

async function changeLocale(page: Page, locale: string) {
  await page
    .context()
    .addCookies([{ name: "beads-desk-locale", value: locale, url: new URL(page.url()).origin }]);
  await page.reload();
}
