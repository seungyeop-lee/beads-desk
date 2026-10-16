import { expect, test } from "../support/bdWorkspace";

test("상세는 연결된 이슈를 보이고, 항목을 누르면 옆 패널에 그 이슈와 연결된 이슈가 보인다", async ({
  page,
  workspace,
}) => {
  const { main, blocker } = await workspace.createIssues(
    {
      main: { title: "연결 검사 주 작업", type: "task" },
      blocker: { title: "연결 검사 선행 작업", type: "task" },
    },
    [["main", "blocker"]],
  );

  await page.goto(`/issues?issue=${main}`);
  const linked = page
    .getByRole("dialog", { name: `${main} 이슈` })
    .getByRole("region", { name: "연결된 이슈" });
  await expect(linked.getByRole("listitem")).toHaveText([/^선행.*연결 검사 선행 작업/]);

  await linked.getByRole("link", { name: `${blocker} 연결 검사 선행 작업` }).click();
  const side = page.getByRole("region", { name: `${blocker} 이슈 옆 패널` });
  await expect(side.getByRole("region", { name: "연결된 이슈" }).getByRole("listitem")).toHaveText([
    /^후속.*연결 검사 주 작업/,
  ]);
});

test("발견 관계는 상세와 옆 패널에서 현재 이슈를 기준으로 작업과 발견한 이슈를 구별한다", async ({
  page,
  workspace,
}, testInfo) => {
  const workTitle = "발견 검사 원래 진행하던 작업";
  const discoveredTitle = "발견 검사 작업 중 새로 발견한 이슈";
  const { work, discovered } = await workspace.createIssues({
    work: { title: workTitle, type: "task" },
    discovered: { title: discoveredTitle, type: "bug" },
  });
  await workspace.bd("dep", "add", discovered, work, "--type", "discovered-from");

  await page.goto(`/issues?issue=${work}`);
  const workLinks = page
    .getByRole("dialog", { name: `${work} 이슈` })
    .getByRole("region", { name: "연결된 이슈" });
  await expect(workLinks.getByRole("listitem")).toHaveText([
    /^이 작업 중 발견한 이슈.*발견 검사 작업 중 새로 발견한 이슈/,
  ]);
  await workLinks.getByRole("listitem").hover();
  await page.screenshot({ path: testInfo.outputPath("discovered-work-detail.png") });

  await workLinks.getByRole("link", { name: `${discovered} ${discoveredTitle}` }).click();
  const discoveredSide = page.getByRole("region", { name: `${discovered} 이슈 옆 패널` });
  await expect(
    discoveredSide.getByRole("region", { name: "연결된 이슈" }).getByRole("listitem"),
  ).toHaveText([/^이 이슈를 발견한 작업.*발견 검사 원래 진행하던 작업/]);
  await discoveredSide.getByRole("listitem").hover();
  await page.screenshot({ path: testInfo.outputPath("discovered-issue-side.png") });

  await page.goto(`/issues?issue=${discovered}`);
  const discoveredLinks = page
    .getByRole("dialog", { name: `${discovered} 이슈` })
    .getByRole("region", { name: "연결된 이슈" });
  await expect(discoveredLinks.getByRole("listitem")).toHaveText([
    /^이 이슈를 발견한 작업.*발견 검사 원래 진행하던 작업/,
  ]);
  await discoveredLinks.getByRole("listitem").hover();
  await page.screenshot({ path: testInfo.outputPath("discovered-issue-detail.png") });

  await discoveredLinks.getByRole("link", { name: `${work} ${workTitle}` }).click();
  const workSide = page.getByRole("region", { name: `${work} 이슈 옆 패널` });
  await expect(
    workSide.getByRole("region", { name: "연결된 이슈" }).getByRole("listitem"),
  ).toHaveText([/^이 작업 중 발견한 이슈.*발견 검사 작업 중 새로 발견한 이슈/]);
  await workSide.getByRole("listitem").hover();
  await page.screenshot({ path: testInfo.outputPath("discovered-work-side.png") });
});

test("연결된 이슈 항목은 제목을 관계와 ID 아래 줄에 따로 보인다", async ({ page, workspace }) => {
  const blockerTitle = "좁은 열에서도 읽혀야 하는 꽤 긴 선행 작업 제목";
  const { main, blocker } = await workspace.createIssues(
    {
      main: { title: "줄 검사 주 작업", type: "task" },
      blocker: { title: blockerTitle, type: "task" },
    },
    [["main", "blocker"]],
  );

  await page.goto(`/issues?issue=${main}`);
  const item = page
    .getByRole("dialog", { name: `${main} 이슈` })
    .getByRole("region", { name: "연결된 이슈" })
    .getByRole("listitem");
  const idBox = await item.getByText(blocker, { exact: true }).boundingBox();
  const titleBox = await item.getByText(blockerTitle, { exact: true }).boundingBox();
  expect(titleBox!.y).toBeGreaterThanOrEqual(idBox!.y + idBox!.height);
});

test("연결된 이슈 항목의 지우기 단추는 항목 링크 대신 눌려 관계를 지운다", async ({
  page,
  workspace,
}) => {
  const { main, blocker } = await workspace.createIssues(
    {
      main: { title: "지우기 검사 주 작업", type: "task" },
      blocker: { title: "지우기 검사 선행 작업", type: "task" },
    },
    [["main", "blocker"]],
  );

  await page.goto(`/issues?issue=${main}`);
  const dialog = page.getByRole("dialog", { name: `${main} 이슈` });
  page.once("dialog", (confirm) => void confirm.accept());
  await dialog.getByRole("button", { name: `${blocker} 의존 관계 지우기` }).click();

  await expect(
    dialog.getByRole("region", { name: "연결된 이슈" }).getByRole("listitem"),
  ).toHaveCount(0);
  await expect(page).not.toHaveURL(/side=/);
});

test("이슈 표의 의존 칸은 선행과 후속 이슈 개수를 이름으로 알려 준다", async ({
  page,
  workspace,
}) => {
  await workspace.createIssues(
    {
      main: { title: "개수 검사 작업", type: "task" },
      blocker: { title: "개수 검사 선행 작업", type: "task" },
    },
    [["main", "blocker"]],
  );

  await page.goto("/issues");
  await expect(page.getByTitle("선행 1개 · 후속 0개", { exact: true })).toBeVisible();
});
