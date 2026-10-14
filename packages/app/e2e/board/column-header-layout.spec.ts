import { expect, test } from "../support/bdWorkspace";
import { textBaselines } from "../support/textBaselines";

test("보드 열 머리줄의 열 이름과 이슈 개수는 같은 baseline에 놓인다", async ({
  page,
  workspace,
}) => {
  await workspace.createIssue("머리줄 검사 작업");

  await page.goto("/board");
  const heading = page.getByRole("region", { name: "바로 작업 가능" }).getByRole("heading");
  await expect(heading).toBeVisible();

  const baselines = await textBaselines(heading);
  expect(baselines.map(({ text }) => text)).toEqual(["바로 작업 가능", "1"]);
  const [first] = baselines;
  expect(baselines).toEqual(baselines.map(({ text }) => ({ text, baseline: first.baseline })));
});
