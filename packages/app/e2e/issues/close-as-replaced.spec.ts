import type { Page } from "@playwright/test";
import { expect, SAVE_TIMEOUT, test, type BdWorkspace } from "../support/bdWorkspace";

test("결정 A를 상세에서 결정 B로 대체하면 A가 닫히고, 결정 화면에서 B가 A를 대체한 것으로 보인다", async ({
  page,
  workspace,
}) => {
  const { previous, next } = await workspace.createIssues({
    previous: { title: "e2e 이전 결정", type: "decision" },
    next: { title: "e2e 새 결정", type: "decision" },
  });

  await page.goto(`/issues?issue=${previous}`);
  const confirm = answerNextConfirm(page, true);
  await pickTarget(page, previous, "다른 이슈로 대체", "e2e 새", next);
  expect(await confirm).toBe(`${previous}을(를) ${next}(으)로 대체하고 닫을까요?`);

  await expect(
    page.getByText(`${previous}을(를) ${next}(으)로 대체하고 닫았습니다.`),
  ).toBeVisible();
  await expectStatus(workspace, previous, "closed");

  await page.goto("/decisions");
  const nextRow = page.getByRole("row").filter({ hasText: "e2e 새 결정" });
  await expect(nextRow).toContainText("이전 결정");
  await expect(nextRow.getByRole("link", { name: previous, exact: true })).toBeVisible();
});

test("이슈 C를 D의 중복으로 표시하면 확인 창에서 거절할 때는 그대로 두고, 수락하면 C가 닫히며 상세에 원본 D가 보인다", async ({
  page,
  workspace,
}) => {
  const { duplicate, canonical } = await workspace.createIssues({
    duplicate: { title: "e2e 중복 작업", type: "task" },
    canonical: { title: "e2e 원본 작업", type: "task" },
  });

  await page.goto(`/issues?issue=${duplicate}`);
  const rejected = answerNextConfirm(page, false);
  await pickTarget(page, duplicate, "중복으로 닫기", "e2e 원본", canonical);
  expect(await rejected).toBe(`${duplicate}을(를) ${canonical}의 중복으로 표시하고 닫을까요?`);
  expect((await workspace.showIssue(duplicate)).status).toBe("open");

  const accepted = answerNextConfirm(page, true);
  await pickTarget(page, duplicate, "중복으로 닫기", "e2e 원본", canonical);
  await accepted;

  await expect(
    page.getByText(`${duplicate}을(를) ${canonical}의 중복으로 닫았습니다.`),
  ).toBeVisible();
  await expectStatus(workspace, duplicate, "closed");
  const detail = page.getByRole("dialog", { name: `${duplicate} 이슈` });
  await expect(detail.getByLabel("상태", { exact: true })).toHaveValue("closed");
  await expect(
    detail
      .getByRole("listitem")
      .filter({ hasText: "원본" })
      .getByRole("link", { name: `${canonical} e2e 원본 작업` }),
  ).toBeVisible();
});

test("이 이슈가 이미 의존하는 이슈와 자기 자신은 대상 후보에 없다", async ({ page, workspace }) => {
  const { main, other } = await workspace.createIssues(
    {
      main: { title: "e2e 후보 주 작업", type: "task" },
      blocker: { title: "e2e 후보 선행 작업", type: "task" },
      other: { title: "e2e 후보 다른 작업", type: "task" },
    },
    [["main", "blocker"]],
  );

  await page.goto(`/issues?issue=${main}`);
  const detail = page.getByRole("dialog", { name: `${main} 이슈` });
  await detail.getByRole("combobox", { name: "대상 이슈 찾기" }).fill("e2e 후보");
  const options = detail.getByRole("listbox", { name: "대상 이슈 찾기" }).getByRole("option");
  await expect(options).toHaveCount(1);
  await expect(options).toContainText(other);
});

/**
 * 다음에 뜨는 확인 창에 답하고 그 문구를 돌려줍니다.
 * 확인 창은 후보를 누르는 동안 열리고, 답하기 전에는 click이 끝나지 않으므로 누르기 전에 답을 정해 둡니다.
 */
function answerNextConfirm(page: Page, accept: boolean): Promise<string> {
  return new Promise((resolve) => {
    page.once("dialog", (dialog) => {
      resolve(dialog.message());
      void (accept ? dialog.accept() : dialog.dismiss());
    });
  });
}

/** 상세의 대체·중복으로 닫기에서 방법을 고르고, 검색어로 찾은 대상 이슈를 고릅니다. */
async function pickTarget(page: Page, id: string, method: string, query: string, target: string) {
  const detail = page.getByRole("dialog", { name: `${id} 이슈` });
  await detail.getByLabel("닫는 방법").selectOption({ label: method });
  const search = detail.getByRole("combobox", { name: "대상 이슈 찾기" });
  // 확인 창에서 거절하면 검색어가 남으므로, 비우고 다시 입력해 후보 목록을 엽니다.
  await search.clear();
  await search.fill(query);
  await detail
    .getByRole("listbox", { name: "대상 이슈 찾기" })
    .getByRole("option", { name: new RegExp(target) })
    .click();
}

async function expectStatus(workspace: BdWorkspace, id: string, status: string) {
  await expect
    .poll(async () => (await workspace.showIssue(id)).status, { timeout: SAVE_TIMEOUT })
    .toBe(status);
}
