import type { Locator, Page } from "@playwright/test";
import { expect, test, type BdWorkspace } from "../support/bdWorkspace";

test("의존 이슈를 누르면 옆 패널에 읽기 전용으로 열리고, 주소로 새로고침과 뒤로·앞으로 가기를 따른다", async ({
  page,
  workspace,
}) => {
  const { main, dependency } = await seedDependency(workspace);

  await page.goto("/issues");
  await page.getByRole("link", { name: "주 이슈" }).click();
  const dialog = page.getByRole("dialog", { name: `${main} 이슈` });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("link", { name: /^이전 이슈/ })).toHaveCount(0);

  await dependencyLink(dialog, dependency).click();
  const side = sidePanel(page, dependency);
  await expect(side).toBeVisible();
  await expect(page).toHaveURL(detailUrl(main, dependency));
  await expect(side.getByRole("heading", { name: "선행 이슈" })).toBeVisible();
  await expect(side.getByText("선행 이슈 설명")).toBeVisible();
  await expect(side.locator("input, textarea, select")).toHaveCount(0);

  await page.reload();
  await expect(side).toBeVisible();

  await page.goBack();
  await expect(side).toBeHidden();
  await expect(page).toHaveURL(detailUrl(main, null));
  await page.goForward();
  await expect(side).toBeVisible();

  await side.getByRole("link", { name: "옆 패널 닫기" }).click();
  await expect(side).toBeHidden();
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(detailUrl(main, null));
});

test("옆 패널의 이슈로 이동한 뒤 이전 이슈 버튼을 누르면 떠날 때의 옆 패널과 함께 돌아온다", async ({
  page,
  workspace,
}) => {
  const { main, dependency } = await seedDependency(workspace);

  await page.goto("/issues");
  await page.getByRole("link", { name: "주 이슈" }).click();
  await dependencyLink(page.getByRole("dialog", { name: `${main} 이슈` }), dependency).click();
  await sidePanel(page, dependency).getByRole("link", { name: "이 이슈로 이동" }).click();

  await expect(page.getByRole("dialog", { name: `${dependency} 이슈` })).toBeVisible();
  await expect(sidePanel(page, dependency)).toBeHidden();
  await expect(page).toHaveURL(detailUrl(dependency, null));

  await page.getByRole("link", { name: `이전 이슈 ${main}로 돌아가기` }).click();
  await expect(page.getByRole("dialog", { name: `${main} 이슈` })).toBeVisible();
  await expect(sidePanel(page, dependency)).toBeVisible();
  await expect(page).toHaveURL(detailUrl(main, dependency));
  await expect(page.getByRole("link", { name: /^이전 이슈/ })).toHaveCount(0);
});

test("옆 패널의 이슈로 이동하고 돌아오기를 되풀이해도 dialog에는 그 이슈의 상세가 한 번만 보인다", async ({
  page,
  workspace,
}) => {
  const { main, dependency } = await seedDependency(workspace);
  const dialog = page.getByRole("dialog");
  const dependencyDescription = dialog.getByText("선행 이슈 설명");

  await page.goto("/issues");
  await page.getByRole("link", { name: "주 이슈" }).click();
  await dependencyLink(dialog, dependency).click();

  for (let round = 0; round < 2; round++) {
    await sidePanel(page, dependency).getByRole("link", { name: "이 이슈로 이동" }).click();
    await expect(page.getByRole("dialog", { name: `${dependency} 이슈` })).toBeVisible();
    await expect(dependencyDescription).toHaveCount(1);

    await page.getByRole("link", { name: `이전 이슈 ${main}로 돌아가기` }).click();
    // 주 상세가 주 이슈를 받은 뒤에 세어, 주 이슈를 받기 전까지 이전 이슈를 보이는 순간을 세지 않습니다.
    await expect(dependencyLink(dialog, dependency)).toBeVisible();
    await expect(sidePanel(page, dependency)).toBeVisible();
    await expect(dependencyDescription).toHaveCount(1);
  }
});

/** 막힘 안내에도 같은 이슈 링크가 있으므로, 의존 관계 목록의 링크를 고릅니다. */
function dependencyLink(dialog: Locator, dependency: string) {
  return dialog
    .getByRole("region", { name: "이 이슈가 의존하는 이슈" })
    .getByRole("link", { name: `${dependency} 선행 이슈` });
}

async function seedDependency(workspace: BdWorkspace) {
  const main = await workspace.createIssue("주 이슈", "--type", "task");
  const dependency = await workspace.createIssue(
    "선행 이슈",
    "--type",
    "task",
    "--description",
    "선행 이슈 설명",
  );
  await workspace.bd("dep", "add", main, dependency);
  return { main, dependency };
}

function sidePanel(page: Page, id: string) {
  return page.getByRole("region", { name: `${id} 이슈 옆 패널` });
}

/** 상세 dialog 주소입니다. 다른 query가 끼어들지 않았는지까지 확인합니다. */
function detailUrl(issue: string, side: string | null): RegExp {
  const query = side ? `issue=${issue}&side=${side}` : `issue=${issue}`;
  return new RegExp(`/issues\\?${query}$`);
}
