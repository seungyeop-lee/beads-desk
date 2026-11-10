import { expect, test } from "../support/bdWorkspace";
import { localDay } from "../support/localDate";

test("epic 미소속 필터와 보기 탭은 주소를 따르고, epic과 원래 이슈 상세를 닫아도 필터, 검색, 스크롤을 유지한다", async ({
  page,
  workspace,
}) => {
  const { waiting, root, nested } = await workspace.createIssues(
    {
      doing: { title: "진행하는 작업", type: "task", status: "in_progress" },
      blocker: { title: "선행 작업", type: "task" },
      waiting: { title: "기다리는 작업", type: "task", labels: ["ui"] },
      later: { title: "미룬 작업", type: "task", status: "deferred" },
      done: { title: "끝난 작업", type: "task", status: "closed" },
      root: { title: "최상위 epic", type: "epic" },
      direct: { title: "회원 직접 작업", type: "task", parent: "root" },
      parent: { title: "회원 중간 작업", type: "task", parent: "root" },
      indirect: { title: "회원 간접 작업", type: "task", parent: "parent" },
      nested: {
        title: "닫힌 하위 epic",
        type: "epic",
        status: "closed",
        parent: "root",
      },
      nestedChild: { title: "회원 하위 작업", type: "task", parent: "nested" },
      ...Object.fromEntries(
        Array.from({ length: 28 }, (_, index) => [
          `member${index}`,
          { title: `회원 스크롤 작업 ${index}`, type: "task", parent: "root" },
        ]),
      ),
    },
    [
      ["waiting", "blocker"],
      ["later", "blocker"],
    ],
  );

  await page.goto("issues");
  const tabs = page.getByRole("navigation", { name: "보기" });
  const noEpic = page.getByRole("checkbox", { name: "epic 미소속만" });
  const search = page.getByRole("searchbox", { name: "검색" });
  const row = (title: string) =>
    page.getByRole("row").filter({ has: page.getByRole("link", { name: title, exact: true }) });
  await expect(tabs.getByRole("link", { name: "전체 39" })).toHaveAttribute("aria-current", "page");
  await expect(row("최상위 epic").getByRole("link")).toHaveCount(1);
  for (const title of ["회원 직접 작업", "회원 중간 작업", "회원 간접 작업"]) {
    await expect(row(title).getByRole("link", { name: "최상위 epic epic 열기" })).toHaveAttribute(
      "href",
      new RegExp(`[?&]issue=${root}$`),
    );
  }
  await expect(
    row("회원 하위 작업").getByRole("link", { name: "닫힌 하위 epic epic 열기" }),
  ).toHaveAttribute("href", new RegExp(`[?&]issue=${nested}$`));
  await expect(row("선행 작업").getByRole("link")).toHaveCount(1);
  await tabs.getByRole("link", { name: "닫힘 2" }).click();
  await expect(
    row("닫힌 하위 epic").getByRole("link", { name: "최상위 epic epic 열기" }),
  ).toHaveAttribute("href", new RegExp(`[?&]issue=${root}$`));
  await tabs.getByRole("link", { name: "전체 39" }).click();

  await noEpic.check();
  await expect(page).toHaveURL(/[?&]noEpic=1$/);
  await expect(tabs.getByRole("link", { name: "전체 5" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "최상위 epic", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "닫힌 하위 epic", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "회원 간접 작업", exact: true })).toHaveCount(0);
  await tabs.getByRole("link", { name: /^병목 / }).click();
  await expect(page).toHaveURL(/view=bottleneck&noEpic=1$/);
  await expect(noEpic).toBeChecked();
  await expect(page.getByRole("link", { name: "회원 간접 작업", exact: true })).toHaveCount(0);

  await tabs.getByRole("link", { name: "막힘 1" }).click();
  await expect(page).toHaveURL(/\/issues\?view=blocked&noEpic=1$/);
  await expect(tabs.getByRole("link", { name: "막힘 1" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "기다리는 작업", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "진행하는 작업", exact: true })).toHaveCount(0);

  await page.reload();
  await expect(noEpic).toBeChecked();
  await expect(tabs.getByRole("link", { name: "막힘 1" })).toHaveAttribute("aria-current", "page");
  await search.fill("기다리는");
  const blockedAddress = page.url();
  await page.getByRole("link", { name: "기다리는 작업", exact: true }).click();
  await expect(page.getByRole("dialog", { name: `${waiting} 이슈` })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`view=blocked&noEpic=1&issue=${waiting}$`));
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(blockedAddress);
  await expect(search).toHaveValue("기다리는");
  await search.clear();

  await tabs.getByRole("link", { name: "닫힘 1" }).click();
  await expect(page.getByRole("link", { name: "끝난 작업", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(blockedAddress);
  await expect(noEpic).toBeChecked();
  await expect(tabs.getByRole("link", { name: "막힘 1" })).toHaveAttribute("aria-current", "page");

  const today = localDay();
  await page.goto(`issues?from=${today}&type=task&label=ui&noEpic=1`);
  await expect(noEpic).toBeChecked();
  await expect(page.getByLabel("시작일")).toHaveValue(today);
  await expect(tabs.getByRole("link", { name: "전체 1" })).toHaveAttribute("aria-current", "page");
  await search.fill("기다리는");
  await tabs.getByRole("link", { name: "막힘 1" }).click();
  await expect(page).toHaveURL(
    new RegExp(`view=blocked&from=${today}&type=task&label=ui&noEpic=1$`),
  );
  await expect(search).toHaveValue("기다리는");
  await expect(page.getByRole("link", { name: "기다리는 작업", exact: true })).toBeVisible();
  await expect(tabs.getByRole("link", { name: "닫힘 0" })).toBeVisible();
  await noEpic.uncheck();
  await expect(page).not.toHaveURL(/noEpic=/);
  await expect(page).toHaveURL(new RegExp(`view=blocked&from=${today}&type=task&label=ui$`));

  await page.goto("issues?type=task");
  await search.fill("회원");
  await expect(page.getByRole("link", { name: "회원 하위 작업", exact: true })).toBeVisible();
  await row("회원 하위 작업").getByRole("link", { name: "닫힌 하위 epic epic 열기" }).click();
  await expect(page.getByRole("dialog", { name: `${nested} 이슈` })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`type=task&issue=${nested}$`));
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/issues\?type=task$/);
  await expect(search).toHaveValue("회원");

  const lastRow = page
    .getByRole("row")
    .filter({
      has: page.getByRole("link", { name: "최상위 epic epic 열기" }),
    })
    .last();
  await lastRow.scrollIntoViewIfNeeded();
  const original = lastRow.getByRole("link").first();
  const originalHref = await original.getAttribute("href");
  if (!originalHref) throw new Error("원래 이슈 링크의 주소가 없습니다");
  const originalId = new URL(originalHref, page.url()).searchParams.get("issue");
  expect(originalId).not.toBeNull();
  const listAddress = page.url();
  const scrollY = await page.evaluate(() => window.scrollY);
  expect(scrollY).toBeGreaterThan(0);

  await lastRow.getByRole("link", { name: "최상위 epic epic 열기" }).click();
  await expect(page.getByRole("dialog", { name: `${root} 이슈` })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`type=task&issue=${root}$`));
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(listAddress);
  await expect(search).toHaveValue("회원");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollY);

  await original.click();
  await expect(page.getByRole("dialog", { name: `${originalId} 이슈` })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`type=task&issue=${originalId}$`));
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(listAddress);
  await expect(search).toHaveValue("회원");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollY);
});
