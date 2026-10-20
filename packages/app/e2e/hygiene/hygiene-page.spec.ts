import type { Locator, Page } from "@playwright/test";
import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";
import { answerNextConfirm } from "../support/confirmDialog";

const DUPLICATE_DESCRIPTION = "로그인 페이지의 비밀번호 재설정 링크를 누르면 404가 납니다.";

test("권장 섹션이 빠진 bug와 거의 같은 이슈 두 개는 각각 권장 섹션 카드와 중복 후보 카드에 보이고, 이슈를 누르면 상세가 열린다", async ({
  page,
  workspace,
}) => {
  const { bug, first, second } = await workspace.createIssues({
    bug: { title: "e2e 재현 절차 없는 버그", type: "bug", description: "가끔 실패합니다." },
    first: { title: "e2e 재설정 링크 오류", type: "task", description: DUPLICATE_DESCRIPTION },
    second: { title: "e2e 재설정 링크 오류", type: "task", description: DUPLICATE_DESCRIPTION },
  });

  await page.goto("hygiene");
  const lint = card(page, "권장 섹션이 빠진 이슈");
  await expect(issueRow(lint, bug)).toContainText(
    "빠진 섹션: Steps to Reproduce, Acceptance Criteria",
  );
  await expect(issueRow(lint, bug).getByRole("button", { name: `${bug} ID 복사` })).toBeVisible();
  const duplicates = card(page, "중복 후보");
  await expect(duplicates.getByRole("link", { name: new RegExp(first) })).toBeVisible();
  await expect(duplicates.getByRole("link", { name: new RegExp(second) })).toBeVisible();

  await lint.getByRole("link", { name: new RegExp(bug) }).click();
  await expect(page.getByRole("dialog", { name: `${bug} 이슈` })).toBeVisible();
});

test("중복 후보 쌍에서 한쪽을 다른 쪽의 중복으로 닫으면 그 이슈가 닫히고 쌍이 카드에서 사라진다", async ({
  page,
  workspace,
}) => {
  const { duplicate, canonical } = await workspace.createIssues({
    duplicate: { title: "e2e 중복 링크 오류", type: "task", description: DUPLICATE_DESCRIPTION },
    canonical: { title: "e2e 중복 링크 오류", type: "task", description: DUPLICATE_DESCRIPTION },
  });

  await page.goto("hygiene");
  const duplicates = card(page, "중복 후보");
  const confirm = answerNextConfirm(page, true);
  await duplicates
    .getByRole("button", { name: `${duplicate}을(를) ${canonical}의 중복으로 닫기` })
    .click();
  expect(await confirm).toBe(`${duplicate}을(를) ${canonical}의 중복으로 표시하고 닫을까요?`);

  await expect
    .poll(async () => (await workspace.showIssue(duplicate)).status, { timeout: SAVE_TIMEOUT })
    .toBe("closed");
  await expect(duplicates.getByText("중복 후보가 없습니다.")).toBeVisible();
});

test("열린 이슈의 id를 메시지에 넣어 커밋하면 커밋에 언급됐지만 열린 이슈 카드에 그 이슈와 커밋이 보인다", async ({
  page,
  workspace,
}) => {
  const orphan = await workspace.createIssue("e2e 커밋만 하고 닫지 않은 작업");
  await workspace.commit(`fix: 재설정 링크 고침 (${orphan})`);

  await page.goto("hygiene");
  const orphans = card(page, "커밋에 언급됐지만 열린 이슈");
  await expect(issueRow(orphans, orphan)).toContainText(`fix: 재설정 링크 고침 (${orphan})`);
});

test("오래 방치된 이슈의 기준 일수를 바꾸면 그 카드만 새 기준으로 다시 읽고, 다른 카드의 목록은 그대로 보인다", async ({
  page,
  workspace,
}) => {
  const bug = await workspace.createIssue("e2e 재현 절차 없는 버그", "--type", "bug");

  await page.goto("hygiene");
  const stale = card(page, "오래 방치된 이슈");
  await expect(stale.getByText("30일 넘게 바뀌지 않은 이슈가 없습니다.")).toBeVisible();
  const staleRead = page.waitForRequest((request) =>
    request.url().includes("/api/hygiene/stale?staleDays=7&"),
  );
  await stale.getByRole("combobox", { name: "기준 일수" }).selectOption({ label: "7일" });

  await staleRead;
  await expect(stale.getByText("7일 넘게 바뀌지 않은 이슈가 없습니다.")).toBeVisible();
  await expect(
    card(page, "권장 섹션이 빠진 이슈").getByRole("link", { name: new RegExp(bug) }),
  ).toBeVisible();
});

function card(page: Page, title: string) {
  return page.getByRole("region", { name: title, exact: true });
}

/** 링크는 행 위에 겹친 빈 요소라, 행에 보이는 글자는 링크를 품은 목록 항목에서 확인합니다. */
function issueRow(card: Locator, id: string) {
  return card
    .getByRole("listitem")
    .filter({ has: card.page().getByRole("link", { name: new RegExp(id) }) });
}
