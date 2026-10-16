import { expect, test } from "../support/bdWorkspace";

test("펼친 에픽의 기능은 처음에 접혀 있고, 펼치면 기능 아래 작업이 보이고 접으면 다시 숨는다", async ({
  page,
  workspace,
}) => {
  const { feature } = await workspace.createIssues({
    epic: { title: "묶음 에픽", type: "epic" },
    feature: { title: "에픽 아래 기능", type: "feature", parent: "epic" },
    nested: { title: "기능 아래 작업", type: "task", parent: "feature" },
  });

  await page.goto("/epics");
  const issueRows = page.getByRole("row").filter({ has: page.getByRole("link") });
  await expect(issueRows).toHaveText([/에픽 아래 기능/]);

  const toggle = page.getByRole("button", { name: `${feature} 하위 이슈 펼치기` });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(issueRows).toHaveText([/에픽 아래 기능/, /기능 아래 작업/]);

  await page.getByRole("button", { name: `${feature} 하위 이슈 접기` }).click();
  await expect(issueRows).toHaveText([/에픽 아래 기능/]);
});
