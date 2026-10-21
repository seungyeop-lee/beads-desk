import { expect, test } from "../support/bdWorkspace";

test("발견 관계는 상세와 옆 패널에서 현재 이슈를 기준으로 작업과 발견한 이슈를 구별한다", async ({
  page,
  workspace,
}) => {
  const workTitle = "발견 검사 원래 진행하던 작업";
  const discoveredTitle = "발견 검사 작업 중 새로 발견한 이슈";
  const { work, discovered } = await workspace.createIssues(
    {
      work: { title: workTitle, type: "task" },
      discovered: { title: discoveredTitle, type: "bug" },
    },
    [["discovered", "work", "discovered-from"]],
  );

  await page.goto(`issues?issue=${work}`);
  const workLinks = page
    .getByRole("dialog", { name: `${work} 이슈` })
    .getByRole("region", { name: "연결된 이슈" });
  await expect(workLinks.getByRole("listitem")).toHaveText([
    /^이 작업 중 발견한 이슈.*발견 검사 작업 중 새로 발견한 이슈/,
  ]);

  await workLinks.getByRole("link", { name: `${discovered} ${discoveredTitle}` }).click();
  const discoveredSide = page.getByRole("region", { name: `${discovered} 이슈 옆 패널` });
  await expect(
    discoveredSide.getByRole("region", { name: "연결된 이슈" }).getByRole("listitem"),
  ).toHaveText([/^이 이슈를 발견한 작업.*발견 검사 원래 진행하던 작업/]);
});
