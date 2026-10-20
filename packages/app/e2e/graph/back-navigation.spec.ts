import { expect, test } from "../support/bdWorkspace";

test("그래프를 연달아 방문한 뒤 닫기로 한 그래프씩 거슬러 최초 화면까지 돌아간다", async ({
  page,
  workspace,
}) => {
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
  await page.goto(`.${origin}`);
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
  await expect(page).toHaveURL(`.${origin}`);
});

test("복귀 정보 없이 그래프 주소로 바로 들어오면 닫기는 그래프의 대체 화면으로 돌아간다", async ({
  page,
  workspace,
}) => {
  const { second } = await workspace.createIssues(
    {
      first: { title: "직접 여는 선행" },
      second: { title: "직접 여는 기준" },
    },
    [["second", "first"]],
  );
  const fallback = `/issues?issue=${second}`;
  await page.goto(`graph?center=${second}`);
  const close = page.getByRole("link", { name: "닫기", exact: true });
  await expect(close).toHaveAttribute("href", `/w/${workspace.slug}${fallback}`);
  await close.click();
  await expect(page).toHaveURL(`.${fallback}`);
});
