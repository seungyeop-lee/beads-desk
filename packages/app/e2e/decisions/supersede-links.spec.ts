import type { Page } from "@playwright/test";
import { koMessages as messages } from "../../src/client/modules/locale/domain/koMessages";
import { expect, test, type BdWorkspace } from "../support/bdWorkspace";

const TITLES = {
  old: "이전 결정: 작업 상태는 bd 저장 상태로만 나눈다",
  new: "새 결정: 작업 상태는 bd 저장 상태와 의존 관계와 human 라벨로 나눈다",
};

test("결정 탭에서 제목으로 상세를 열고, 이전·새 결정 링크로 서로의 상세를 연다", async ({
  page,
  workspace,
}) => {
  const ids = await seedDecisions(workspace);
  await page.goto("decisions");

  await titleRow(page, TITLES.new).getByRole("link", { name: TITLES.new, exact: true }).click();
  await closeDetail(page, ids.new);

  await titleRow(page, TITLES.new).getByRole("link", { name: ids.old, exact: true }).click();
  await closeDetail(page, ids.old);

  await titleRow(page, TITLES.old).getByRole("link", { name: ids.new, exact: true }).click();
  await closeDetail(page, ids.new);
});

/** 유효한 결정 하나와, 그 결정으로 대체되어 닫힌 결정 하나를 심습니다. */
async function seedDecisions(workspace: BdWorkspace) {
  const ids = await workspace.createIssues({
    old: { title: TITLES.old, type: "decision" },
    new: { title: TITLES.new, type: "decision" },
  });
  await workspace.bd("supersede", ids.old, "--with", ids.new);
  return ids;
}

function titleRow(page: Page, title: string) {
  return page
    .getByRole("main")
    .getByRole("row")
    .filter({ has: page.getByRole("link", { name: title, exact: true }) });
}

async function closeDetail(page: Page, id: string) {
  const dialog = page.getByRole("dialog", {
    name: messages.issueDetail.dialog(id),
  });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: messages.common.close, exact: true }).first().click();
  await expect(dialog).toBeHidden();
}
