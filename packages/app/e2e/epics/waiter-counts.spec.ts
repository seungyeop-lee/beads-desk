import type { Page } from "@playwright/test";
import { expect, test } from "../support/bdWorkspace";

const WAITERS = /\d+개 대기/;

/** 막힌 행에는 기다리는 이슈의 제목도 함께 보이므로, 제목 칸의 글자가 정확히 같은 행을 고릅니다. */
function issueRow(page: Page, title: string) {
  return page.getByRole("row").filter({ has: page.getByText(title, { exact: true }) });
}

test("펼친 에픽의 하위 이슈 행에 에픽 밖에서 기다리는 이슈까지 센 대기 수를 이슈 목록과 같게 보인다", async ({
  page,
  workspace,
}) => {
  // 첫 하위 작업은 에픽 안의 이슈 하나와 에픽 밖의 이슈 하나가 기다립니다. 후손만으로 세면 1개가 됩니다.
  await workspace.createIssues(
    {
      epic: { title: "대기 에픽", type: "epic" },
      first: { title: "에픽 첫 작업", type: "task", parent: "epic" },
      second: { title: "에픽 둘째 작업", type: "task", parent: "epic" },
      alone: { title: "에픽 혼자 작업", type: "task", parent: "epic" },
      outside: { title: "에픽 밖 작업", type: "task" },
    },
    [
      ["second", "first"],
      ["outside", "second"],
    ],
  );
  const expected = async () => {
    await expect(issueRow(page, "에픽 첫 작업")).toContainText("2개 대기");
    await expect(issueRow(page, "에픽 둘째 작업")).toContainText("1개 대기");
    await expect(issueRow(page, "에픽 혼자 작업")).not.toContainText(WAITERS);
  };

  await page.goto("/issues");
  await expected();
  await expect(issueRow(page, "에픽 밖 작업")).not.toContainText(WAITERS);

  // 닫히지 않은 첫 에픽은 처음부터 펼쳐져 있습니다.
  await page.goto("/epics");
  await expected();
});
