import { expect, test } from "../support/bdWorkspace";

test("상세와 옆 패널은 연결된 이슈를 목록 하나에 상위, 선행, 후속, 하위 순으로 보이고, 관계 맺기 선택지도 같은 이름을 쓴다", async ({
  page,
  workspace,
}) => {
  const { main, blocker } = await workspace.createIssues(
    {
      epic: { title: "연결 검사 에픽", type: "epic" },
      main: { title: "연결 검사 주 작업", type: "task", parent: "epic" },
      blocker: { title: "연결 검사 선행 작업", type: "task" },
      blocked: { title: "연결 검사 후속 작업", type: "task" },
      child: { title: "연결 검사 하위 작업", type: "task", parent: "main" },
    },
    [
      ["main", "blocker"],
      ["blocked", "main"],
    ],
  );

  await page.goto(`/issues?issue=${main}`);
  const dialog = page.getByRole("dialog", { name: `${main} 이슈` });
  const linked = dialog.getByRole("region", { name: "연결된 이슈" });
  await expect(linked.getByRole("listitem")).toHaveText([
    /^상위.*연결 검사 에픽/,
    /^선행.*연결 검사 선행 작업/,
    /^후속.*연결 검사 후속 작업/,
    /^하위.*연결 검사 하위 작업/,
  ]);
  await expect(dialog.getByLabel("맺을 관계").locator("option")).toHaveText([
    "선행 이슈 (이 이슈보다 먼저 끝나야 함)",
    "후속 이슈 (이 이슈가 끝나야 시작)",
    "상위 이슈",
    "하위 이슈",
    "관련 이슈",
  ]);

  await linked.getByRole("link", { name: `${blocker} 연결 검사 선행 작업` }).click();
  const side = page.getByRole("region", { name: `${blocker} 이슈 옆 패널` });
  await expect(side.getByRole("region", { name: "연결된 이슈" }).getByRole("listitem")).toHaveText([
    /^후속.*연결 검사 주 작업/,
  ]);
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
