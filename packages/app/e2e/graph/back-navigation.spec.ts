import { expect, test } from "../support/bdWorkspace";

test("그래프를 연달아 방문한 뒤 닫기로 한 그래프씩 거슬러 최초 화면까지 돌아간다", async ({
  page,
  workspace,
}, testInfo) => {
  const { second, last } = await workspace.createIssues(
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
  const origin = `/focus?issue=${second}`;
  await page.goto(origin);
  await page
    .getByRole("dialog", { name: `${second} 이슈` })
    .getByRole("link", { name: "선행·후속 그래프" })
    .click();
  await expect(page.getByRole("dialog").getByRole("heading", { level: 1 })).toHaveText(
    "복귀 둘째 · 선행·후속",
  );
  await expect(
    page.getByRole("region", { name: "의존 그래프" }).getByRole("link", { name: /복귀 마지막/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "뒤로가기", exact: true })).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("chain-close-ko.png"),
    animations: "disabled",
  });

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
  await page.getByRole("link", { name: "닫기", exact: true }).click();
  await expect(page).toHaveURL((url) => url.searchParams.get("center") === second);
  await expect(page.getByRole("region", { name: `${last} 이슈` })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog").getByRole("heading", { level: 1 })).toHaveText(
    "복귀 둘째 · 선행·후속",
  );
  const close = page.getByRole("link", { name: "닫기", exact: true });
  await close.focus();
  await expect(close).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(origin);
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
  const close = page.getByRole("link", { name: "닫기", exact: true });
  await expect(close).toHaveAttribute("href", `/focus?issue=${second}`);
  await close.click();
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
      const close = page.getByRole("link", { name: "닫기", exact: true });
      await expect(close).toHaveAttribute("href", fallback!);
    }
    await page.getByRole("link", { name: "닫기", exact: true }).click();
    await expect(page).toHaveURL(fallback!);
  }
});
