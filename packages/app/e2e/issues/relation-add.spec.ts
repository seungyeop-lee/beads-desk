import { expect, SAVE_TIMEOUT, test, type BdWorkspace } from "../support/bdWorkspace";

test("상세의 관계 맺기에서 다섯 가지 관계를 제목으로 찾아 맺으면 bd에 맞는 방향과 유형으로 기록된다", async ({
  page,
  workspace,
}) => {
  const main = await workspace.createIssue("주 이슈", "--type", "task");
  const blocker = await workspace.createIssue("막는 작업", "--type", "task");
  const blocked = await workspace.createIssue("막히는 작업", "--type", "task");
  const parent = await workspace.createIssue("상위 에픽", "--type", "epic");
  const child = await workspace.createIssue("하위 작업", "--type", "task");
  const related = await workspace.createIssue("관련 작업", "--type", "task");

  await page.goto(`/issues?issue=${main}`);
  const dialog = page.getByRole("dialog", { name: `${main} 이슈` });
  const kind = dialog.getByLabel("맺을 관계");
  const search = dialog.getByRole("combobox", { name: "연결할 이슈 찾기" });
  const candidates = dialog.getByRole("listbox", { name: "연결할 이슈 찾기" });

  const link = async (relation: string, query: string, target: string) => {
    await kind.selectOption({ label: relation });
    await search.fill(query);
    await candidates.getByRole("option", { name: new RegExp(target) }).click();
    await expect(page.getByText(`${target}을(를) ${relation}로 연결했습니다.`)).toBeVisible();
  };

  await link("이 이슈를 막는 이슈", "막는", blocker);
  await link("이 이슈가 막는 이슈", "막히는", blocked);
  await link("상위 이슈", "상위", parent);
  await link("하위 이슈", "하위", child);
  await link("관련 이슈", "관련", related);

  await expect
    .poll(async () => dependenciesOf(workspace, main), { timeout: SAVE_TIMEOUT })
    .toEqual([`${blocker} blocks`, `${parent} parent-child`, `${related} related`].sort());
  expect(await dependenciesOf(workspace, blocked)).toEqual([`${main} blocks`]);
  expect(await dependenciesOf(workspace, child)).toEqual([`${main} parent-child`]);
});

test("키보드만으로 후보를 골라 연결하고, 자기 자신과 이미 연결한 이슈는 후보에 없다", async ({
  page,
  workspace,
}) => {
  const main = await workspace.createIssue("키보드 주 작업", "--type", "task");
  const first = await workspace.createIssue("키보드 후보 하나", "--type", "task");
  const second = await workspace.createIssue("키보드 후보 둘", "--type", "task");
  const third = await workspace.createIssue("키보드 후보 셋", "--type", "task");
  await workspace.bd("dep", "add", main, first);

  await page.goto(`/issues?issue=${main}`);
  const dialog = page.getByRole("dialog", { name: `${main} 이슈` });
  const search = dialog.getByRole("combobox", { name: "연결할 이슈 찾기" });
  const candidates = dialog.getByRole("listbox", { name: "연결할 이슈 찾기" });

  await search.fill("키보드");
  // 검색어가 있으면 최근에 고친 순서라 나중에 만든 third가 먼저 옵니다.
  await expect(candidates.getByRole("option")).toHaveText([new RegExp(third), new RegExp(second)]);

  await search.press("ArrowDown");
  await expect(candidates.getByRole("option", { name: new RegExp(second) })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await search.press("Enter");

  await expect
    .poll(async () => dependenciesOf(workspace, main), { timeout: SAVE_TIMEOUT })
    .toEqual([`${first} blocks`, `${second} blocks`].sort());
});

test("bd가 관계 맺기를 거부하면 상세에 오류가 보인다", async ({ page, workspace }) => {
  const main = await workspace.createIssue("순환 주 작업", "--type", "task");
  const middle = await workspace.createIssue("순환 가운데 작업", "--type", "task");
  const end = await workspace.createIssue("순환 끝 작업", "--type", "task");
  await workspace.bd("dep", "add", main, middle);
  await workspace.bd("dep", "add", middle, end);

  await page.goto(`/issues?issue=${main}`);
  const dialog = page.getByRole("dialog", { name: `${main} 이슈` });
  await dialog.getByLabel("맺을 관계").selectOption({ label: "이 이슈가 막는 이슈" });
  await dialog.getByRole("combobox", { name: "연결할 이슈 찾기" }).fill("순환 끝");
  await dialog
    .getByRole("listbox", { name: "연결할 이슈 찾기" })
    .getByRole("option", { name: new RegExp(end) })
    .click();

  await expect(dialog.getByRole("alert")).toContainText("cycle");
});

async function dependenciesOf(workspace: BdWorkspace, id: string) {
  const issue = await workspace.showIssue(id);
  return (issue.dependencies ?? []).map((dep) => `${dep.id} ${dep.dependency_type}`).sort();
}
