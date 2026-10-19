import type { Locator, Page } from "@playwright/test";
import { expect, test, type BdWorkspace } from "../support/bdWorkspace";

test("의존 이슈를 누르면 옆 패널에 읽기 전용으로 열려 그 이슈와 연결된 이슈를 보이고, 주소로 새로고침과 뒤로·앞으로 가기를 따른다", async ({
  page,
  workspace,
}) => {
  const { main, dependency } = await seedDependency(workspace);

  await page.goto("/issues");
  await page.getByRole("link", { name: "주 이슈" }).click();
  const dialog = page.getByRole("dialog", { name: `${main} 이슈` });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("link", { name: /^이전 이슈/ })).toHaveCount(0);
  await expect(linkedItems(dialog)).toHaveText([/^선행.*선행 이슈/]);

  await dependencyLink(dialog, dependency).click();
  const side = sidePanel(page, dependency);
  await expect(side).toBeVisible();
  await expect(page).toHaveURL(detailUrl(main, dependency));
  await expect(side.getByRole("button", { name: `${dependency} ID 복사` })).toBeVisible();
  await expect(side.getByRole("heading", { name: "선행 이슈" })).toBeVisible();
  await expect(side.getByText("선행 이슈 설명")).toBeVisible();
  await expect(linkedItems(side)).toHaveText([/^후속.*주 이슈/]);
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

test("옆 패널이 열린 상세에서 Escape를 누르면 옆 패널만 닫혀 이전 이슈 버튼과 함께 주 상세가 남고, 한 번 더 누르면 상세가 닫힌다", async ({
  page,
  workspace,
}) => {
  const { main, dependency } = await seedDependency(workspace);
  const dialog = page.getByRole("dialog", { name: `${dependency} 이슈` });
  const back = dialog.getByRole("link", { name: `이전 이슈 ${main}로 돌아가기` });

  await page.goto("/issues");
  await page.getByRole("link", { name: "주 이슈" }).click();
  await dependencyLink(page.getByRole("dialog"), dependency).click();
  await sidePanel(page, dependency).getByRole("link", { name: "이 이슈로 이동" }).click();
  await linkedItems(dialog)
    .getByRole("link", { name: `${main} 주 이슈` })
    .click();
  const side = sidePanel(page, main);
  await expect(side).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(side).toBeHidden();
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(detailUrl(dependency, null));
  await expect(back).toHaveAttribute("href", detailUrl(main, dependency));

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/issues$/);
});

test("옆 패널이 열린 상세에서 본문을 편집하는 중에 Escape를 누르면 옆 패널도 상세도 닫히지 않는다", async ({
  page,
  workspace,
}) => {
  const { main, dependency } = await seedDependency(workspace);

  await page.goto(`/issues?issue=${main}&side=${dependency}`);
  const dialog = page.getByRole("dialog", { name: `${main} 이슈` });
  const side = sidePanel(page, dependency);
  await expect(side).toBeVisible();
  await dialog.getByRole("button", { name: "설명 추가" }).click();
  const editor = dialog.getByRole("textbox", { name: "설명" });
  await expect(editor).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(editor).toBeFocused();
  await expect(side).toBeVisible();
  await expect(page).toHaveURL(detailUrl(main, dependency));
});

test("옆 패널은 그 이슈의 댓글을 작성자, markdown 본문과 함께 읽기 전용으로 보인다", async ({
  page,
  workspace,
}) => {
  const { main, dependency } = await seedDependency(workspace);
  await workspace.bd("comments", "add", dependency, "**먼저 남긴 댓글**", "--author", "리뷰어");

  await page.goto("/issues");
  await page.getByRole("link", { name: "주 이슈" }).click();
  await dependencyLink(page.getByRole("dialog", { name: `${main} 이슈` }), dependency).click();
  const side = sidePanel(page, dependency);
  const comments = side.getByRole("article");

  await expect(side.getByRole("heading", { name: "댓글" })).toBeVisible();
  await expect(comments).toHaveCount(1);
  await expect(comments.getByText("리뷰어")).toBeVisible();
  await expect(comments.getByRole("strong")).toHaveText("먼저 남긴 댓글");
  await expect(side.locator("input, textarea, select")).toHaveCount(0);
  await expect(side.getByRole("button", { name: "댓글 남기기" })).toHaveCount(0);
});

test("옆 패널의 이슈로 이동한 뒤 이전 이슈 버튼을 누르면 떠날 때의 옆 패널과 함께 돌아오고, 되풀이해도 dialog에는 그 이슈의 상세가 한 번만 보인다", async ({
  page,
  workspace,
}) => {
  const { main, dependency } = await seedDependency(workspace);
  const dialog = page.getByRole("dialog");
  const dependencyDescription = dialog.getByText("선행 이슈 설명");
  const back = page.getByRole("link", { name: `이전 이슈 ${main}로 돌아가기` });

  await page.goto("/issues");
  await page.getByRole("link", { name: "주 이슈" }).click();
  await dependencyLink(dialog, dependency).click();

  for (let round = 0; round < 2; round++) {
    await sidePanel(page, dependency).getByRole("link", { name: "이 이슈로 이동" }).click();
    await expect(page.getByRole("dialog", { name: `${dependency} 이슈` })).toBeVisible();
    await expect(dependencyDescription).toHaveCount(1);
    if (round === 0) {
      await expect(sidePanel(page, dependency)).toBeHidden();
      await expect(page).toHaveURL(detailUrl(dependency, null));
    }

    await back.click();
    // 주 상세가 주 이슈를 받은 뒤에 세어, 주 이슈를 받기 전까지 이전 이슈를 보이는 순간을 세지 않습니다.
    await expect(dependencyLink(dialog, dependency)).toBeVisible();
    await expect(sidePanel(page, dependency)).toBeVisible();
    await expect(dependencyDescription).toHaveCount(1);
    if (round === 0) {
      await expect(page.getByRole("dialog", { name: `${main} 이슈` })).toBeVisible();
      await expect(page).toHaveURL(detailUrl(main, dependency));
      await expect(back).toHaveCount(0);
    }
  }
});

/** 막힘 안내에도 같은 이슈 링크가 있으므로, 의존 관계 목록의 링크를 고릅니다. */
function dependencyLink(dialog: Locator, dependency: string) {
  return dialog
    .getByRole("region", { name: "연결된 이슈" })
    .getByRole("link", { name: `${dependency} 선행 이슈` });
}

function linkedItems(scope: Locator) {
  return scope.getByRole("region", { name: "연결된 이슈" }).getByRole("listitem");
}

async function seedDependency(workspace: BdWorkspace) {
  return workspace.createIssues(
    {
      main: { title: "주 이슈", type: "task" },
      dependency: { title: "선행 이슈", type: "task", description: "선행 이슈 설명" },
    },
    [["main", "dependency"]],
  );
}

function sidePanel(page: Page, id: string) {
  return page.getByRole("region", { name: `${id} 이슈 옆 패널` });
}

/** 상세 dialog 주소입니다. 다른 query가 끼어들지 않았는지까지 확인합니다. */
function detailUrl(issue: string, side: string | null): RegExp {
  const query = side ? `issue=${issue}&side=${side}` : `issue=${issue}`;
  return new RegExp(`/issues\\?${query}$`);
}
