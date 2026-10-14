import { expect, test } from "../support/bdWorkspace";

test("펼친 에픽의 기능은 처음에 접혀 있고, 펼치면 기능 아래 작업이 기능 바로 아래에 보이며, 진행률은 직접 하위 이슈만 센다", async ({
  page,
  workspace,
}) => {
  // bd의 만든 시각은 초 단위라 한 번에 만든 이슈는 우선순위로만 순서가 정해지게 합니다.
  const { epic, feature } = await workspace.createIssues({
    epic: { title: "묶음 에픽", type: "epic" },
    feature: { title: "에픽 아래 기능", type: "feature", priority: 1, parent: "epic" },
    direct: { title: "에픽 바로 아래 작업", type: "task", priority: 2, parent: "epic" },
    nested: { title: "기능 아래 급한 작업", type: "task", priority: 0, parent: "feature" },
  });

  await page.goto("/epics");
  const issueRows = page.getByRole("row").filter({ has: page.getByRole("link") });
  await expect(issueRows).toHaveText([/에픽 아래 기능/, /에픽 바로 아래 작업/]);
  await expect(page.getByLabel(`${epic} 진행률`)).toHaveAttribute("max", "2");

  const toggle = page.getByRole("button", { name: `${feature} 하위 이슈 펼치기` });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(issueRows).toHaveText([
    /에픽 아래 기능/,
    /기능 아래 급한 작업/,
    /에픽 바로 아래 작업/,
  ]);

  await page.getByRole("button", { name: `${feature} 하위 이슈 접기` }).click();
  await expect(issueRows).toHaveText([/에픽 아래 기능/, /에픽 바로 아래 작업/]);
});
