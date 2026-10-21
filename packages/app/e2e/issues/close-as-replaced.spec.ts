import type { Page } from "@playwright/test";
import { expect, expectStatus, test } from "../support/bdWorkspace";
import { answerNextConfirm } from "../support/confirmDialog";
import { titleRow } from "../support/tableRows";

test("결정 A를 B로 대체하고 이슈 C를 D의 중복으로 닫으면 bd에서 A와 C가 닫히고, 상세에 원본 D가 보이며, 결정 화면의 이전·새 결정 링크로 서로의 상세를 연다", async ({
  page,
  workspace,
}) => {
  const { previous, next, duplicate, canonical } = await workspace.createIssues({
    previous: { title: "e2e 이전 결정", type: "decision" },
    next: { title: "e2e 새 결정", type: "decision" },
    duplicate: { title: "e2e 중복 작업", type: "task" },
    canonical: { title: "e2e 원본 작업", type: "task" },
  });

  await page.goto(`issues?issue=${previous}`);
  const replaced = answerNextConfirm(page, true);
  await pickTarget(page, previous, "다른 이슈로 대체", "e2e 새", next);
  await replaced;
  await expectStatus(workspace, previous, "closed");

  await page.goto(`issues?issue=${duplicate}`);
  const duplicated = answerNextConfirm(page, true);
  await pickTarget(page, duplicate, "중복으로 닫기", "e2e 원본", canonical);
  await duplicated;
  await expectStatus(workspace, duplicate, "closed");
  const detail = page.getByRole("dialog", { name: `${duplicate} 이슈` });
  await expect(detail.getByLabel("상태", { exact: true })).toHaveValue("closed");
  await expect(
    detail
      .getByRole("listitem")
      .filter({ hasText: "원본" })
      .getByRole("link", { name: `${canonical} e2e 원본 작업` }),
  ).toBeVisible();

  await page.goto("decisions");
  await titleRow(page, "e2e 새 결정")
    .getByRole("link", { name: "e2e 새 결정", exact: true })
    .click();
  await closeDetail(page, next);
  await titleRow(page, "e2e 새 결정").getByRole("link", { name: previous, exact: true }).click();
  await closeDetail(page, previous);
  await titleRow(page, "e2e 이전 결정").getByRole("link", { name: next, exact: true }).click();
  await closeDetail(page, next);
});

/** 상세의 대체·중복으로 닫기에서 방법을 고르고, 검색어로 찾은 대상 이슈를 고릅니다. */
async function pickTarget(page: Page, id: string, method: string, query: string, target: string) {
  const detail = page.getByRole("dialog", { name: `${id} 이슈` });
  await detail.getByLabel("닫는 방법").selectOption({ label: method });
  await detail.getByRole("combobox", { name: "대상 이슈 찾기" }).fill(query);
  await detail
    .getByRole("listbox", { name: "대상 이슈 찾기" })
    .getByRole("option", { name: new RegExp(target) })
    .click();
}

async function closeDetail(page: Page, id: string) {
  const dialog = page.getByRole("dialog", { name: `${id} 이슈` });
  await expect(dialog).toBeVisible();
  // dialog 밖을 눌러 닫는 영역도 이름이 "닫기"인 단추라, 머리글의 닫기 단추는 앞의 것입니다.
  await dialog.getByRole("button", { name: "닫기", exact: true }).first().click();
  await expect(dialog).toBeHidden();
}
