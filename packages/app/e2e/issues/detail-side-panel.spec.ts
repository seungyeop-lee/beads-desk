import type { Locator, Page } from "@playwright/test";
import { expect, test } from "../support/bdWorkspace";

test("의존 이슈를 누르면 옆 패널에 그 이슈와 연결된 이슈가 보이고, 옆 패널 열기와 닫기, 옆 패널의 이슈로 이동과 이전 이슈로 돌아가기, Escape, 관계 지우기를 주소가 따른다", async ({
  page,
  workspace,
}) => {
  const { main, dependency } = await workspace.createIssues(
    {
      main: { title: "주 이슈", type: "task" },
      dependency: { title: "선행 이슈", type: "task", description: "선행 이슈 설명" },
    },
    [["main", "dependency"]],
  );
  const mainDialog = page.getByRole("dialog", { name: `${main} 이슈` });
  const dependencyDialog = page.getByRole("dialog", { name: `${dependency} 이슈` });
  const side = sidePanel(page, dependency);
  const dependencyDescription = page.getByRole("dialog").getByText("선행 이슈 설명");
  const back = page.getByRole("link", { name: `이전 이슈 ${main}로 돌아가기` });

  await page.goto("issues");
  await page.getByRole("link", { name: "주 이슈" }).click();
  await expect(linkedItems(mainDialog)).toHaveText([/^선행.*선행 이슈/]);

  await dependencyLink(mainDialog, dependency).click();
  await expect(page).toHaveURL(detailUrl(main, dependency));
  await expect(side.getByRole("heading", { name: "선행 이슈" })).toBeVisible();
  await expect(side.getByText("선행 이슈 설명")).toBeVisible();
  await expect(linkedItems(side)).toHaveText([/^후속.*주 이슈/]);

  await page.reload();
  await expect(side).toBeVisible();
  await page.goBack();
  await expect(side).toBeHidden();
  await expect(page).toHaveURL(detailUrl(main, null));
  await page.goForward();
  await expect(side).toBeVisible();

  await side.getByRole("link", { name: "옆 패널 닫기" }).click();
  await expect(side).toBeHidden();
  await expect(mainDialog).toBeVisible();
  await expect(page).toHaveURL(detailUrl(main, null));

  // 옆 패널의 이슈로 옮겼다가 이전 이슈 버튼으로 돌아오기를 되풀이해도, 주소가 바뀌는 사이에 dialog가 상세를 겹쳐 보이지 않아야 합니다.
  await dependencyLink(mainDialog, dependency).click();
  for (let round = 0; round < 2; round++) {
    await side.getByRole("link", { name: "이 이슈로 이동" }).click();
    await expect(dependencyDialog).toBeVisible();
    await expect(dependencyDescription).toHaveCount(1);
    if (round === 0) {
      await expect(side).toBeHidden();
      await expect(page).toHaveURL(detailUrl(dependency, null));
    }

    await back.click();
    // 주 상세가 주 이슈를 받은 뒤에 세어, 주 이슈를 받기 전까지 이전 이슈를 보이는 순간을 세지 않습니다.
    await expect(dependencyLink(mainDialog, dependency)).toBeVisible();
    await expect(side).toBeVisible();
    await expect(dependencyDescription).toHaveCount(1);
    if (round === 0) await expect(page).toHaveURL(detailUrl(main, dependency));
  }

  // 페이지를 누르지 않고 연달아 누른 Escape는 사용자 활성화가 없어 브라우저가 dialog의 cancel을 취소할 수 없게 보내므로,
  // 상세를 누른 뒤 누른 Escape와 주소로 들어와 바로 누른 Escape를 따로 확인합니다.
  await side.getByRole("link", { name: "이 이슈로 이동" }).click();
  await linkedItems(dependencyDialog)
    .getByRole("link", { name: `${main} 주 이슈` })
    .click();
  await expect(sidePanel(page, main)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sidePanel(page, main)).toBeHidden();
  await expect(dependencyDialog).toBeVisible();
  await expect(page).toHaveURL(detailUrl(dependency, null));
  await expect(back).toHaveAttribute("href", detailUrl(main, dependency));
  await page.keyboard.press("Escape");
  await expect(dependencyDialog).toBeHidden();
  await expect(page).toHaveURL(/\/issues$/);

  await page.goto(`issues?issue=${main}&side=${dependency}`);
  await expect(side.getByText("선행 이슈 설명")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(side).toBeHidden();
  await expect(mainDialog).toBeVisible();
  await expect(page).toHaveURL(detailUrl(main, null));
  await page.keyboard.press("Escape");
  await expect(mainDialog).toBeHidden();
  await expect(page).toHaveURL(/\/issues$/);

  // 연결된 이슈 항목의 지우기 단추는 항목 링크 대신 눌려, 옆 패널을 열지 않고 관계를 지웁니다.
  await page.goto(`issues?issue=${main}`);
  page.once("dialog", (confirm) => void confirm.accept());
  await mainDialog.getByRole("button", { name: `${dependency} 의존 관계 지우기` }).click();
  await expect(linkedItems(mainDialog)).toHaveCount(0);
  await expect(page).not.toHaveURL(/side=/);
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

function sidePanel(page: Page, id: string) {
  return page.getByRole("region", { name: `${id} 이슈 옆 패널` });
}

/** 상세 dialog 주소입니다. 다른 query가 끼어들지 않았는지까지 확인합니다. */
function detailUrl(issue: string, side: string | null): RegExp {
  const query = side ? `issue=${issue}&side=${side}` : `issue=${issue}`;
  return new RegExp(`/issues\\?${query}$`);
}
