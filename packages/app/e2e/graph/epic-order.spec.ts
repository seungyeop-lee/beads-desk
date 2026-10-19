import { expect, test } from "../support/bdWorkspace";

test("상단 탭에는 그래프가 없고, 에픽 화면의 순서 보기는 후손 이슈를 그래프로 열며, 노드를 눌러 연 상세를 Escape로 닫는다", async ({
  page,
  workspace,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { epic, third } = await workspace.createIssues(
    {
      epic: { title: "순서 에픽", type: "epic" },
      parent: { title: "순서 상위", parent: "epic" },
      first: { title: "순서 첫째", parent: "epic", status: "closed" },
      second: { title: "순서 둘째", parent: "epic" },
      third: { title: "순서 셋째", parent: "parent" },
    },
    [
      ["second", "first"],
      ["third", "second"],
    ],
  );

  await page.goto("/epics");
  await expect(
    page.getByRole("navigation", { name: "화면" }).getByRole("link", { name: "에픽" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "화면" }).getByRole("link", { name: "그래프" }),
  ).toHaveCount(0);

  await page
    .locator("section")
    .filter({ hasText: "순서 에픽" })
    .getByRole("link", { name: "순서 보기" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/epics\\?epic=${epic}(?:&returnTo=[^&]+)?$`));
  await expect(page.getByRole("dialog").getByRole("heading", { level: 1 })).toHaveText(
    "순서 에픽 · 순서",
  );

  const canvas = page.getByRole("region", { name: "의존 그래프" });
  const node = (title: string) => canvas.getByRole("link", { name: new RegExp(title) });
  await expect(node("순서 첫째")).toBeVisible();
  await expect(node("순서 셋째")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("epic-order.png") });

  await node("순서 셋째").click();
  await expect(page.getByRole("region", { name: `${third} 이슈` })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`epic=${epic}(?:&returnTo=[^&]+)?&issue=${third}$`));
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(new RegExp(`/epics\\?epic=${epic}(?:&returnTo=[^&]+)?$`));
  await expect(node("순서 셋째")).toBeVisible();
});

test("상위 에픽을 펼친 하위 목록에서 하위 에픽 행의 순서 보기를 누르면 그 에픽의 순서 그래프가 열리고, 닫으면 에픽 화면으로 돌아온다", async ({
  page,
  workspace,
}) => {
  const { child } = await workspace.createIssues({
    parent: { title: "바깥 에픽", type: "epic" },
    child: { title: "안쪽 에픽", type: "epic", parent: "parent" },
    task: { title: "안쪽 작업", parent: "child" },
  });

  await page.goto("/epics");
  const childRow = page.getByRole("row", { name: /안쪽 에픽/ });
  await childRow.getByRole("link", { name: "순서 보기" }).click();
  await expect(page).toHaveURL(new RegExp(`/epics\\?epic=${child}(?:&returnTo=[^&]+)?$`));
  await expect(page.getByRole("dialog").getByRole("heading", { level: 1 })).toHaveText(
    "안쪽 에픽 · 순서",
  );
  // blocks 관계가 없는 이슈는 그래프 대신 선후 관계 없음 목록에 나옵니다.
  await expect(page.getByRole("dialog").getByRole("link", { name: /안쪽 작업/ })).toBeVisible();

  await page.getByRole("dialog").getByRole("link", { name: "닫기", exact: true }).click();
  await expect(page).toHaveURL(/\/epics$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(childRow.getByRole("link", { name: "순서 보기" })).toBeVisible();
});
