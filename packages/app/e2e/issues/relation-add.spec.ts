import { expect, SAVE_TIMEOUT, test, type BdWorkspace } from "../support/bdWorkspace";

test("상세의 관계 맺기에서 고른 관계와 찾은 이슈로 bd에 의존 관계를 맺는다", async ({
  page,
  workspace,
}) => {
  const { main, blocked } = await workspace.createIssues({
    main: { title: "주 이슈", type: "task" },
    blocked: { title: "막히는 작업", type: "task" },
  });

  await page.goto(`/issues?issue=${main}`);
  const dialog = page.getByRole("dialog", { name: `${main} 이슈` });
  await dialog.getByLabel("맺을 관계").selectOption({ label: "후속 이슈 (이 이슈가 끝나야 시작)" });
  await dialog.getByRole("combobox", { name: "연결할 이슈 찾기" }).fill("막히는");
  await dialog
    .getByRole("listbox", { name: "연결할 이슈 찾기" })
    .getByRole("option", { name: new RegExp(blocked) })
    .click();

  // toast에는 선택지의 설명 없이 관계 이름만 나옵니다.
  await expect(page.getByText(`${blocked}을(를) 후속 이슈로 연결했습니다.`)).toBeVisible();
  await expect
    .poll(async () => dependenciesOf(workspace, blocked), { timeout: SAVE_TIMEOUT })
    .toEqual([`${main} blocks`]);
});

test("키보드만으로 후보를 골라 연결하고, 자기 자신과 이미 연결한 이슈는 후보에 없다", async ({
  page,
  workspace,
}) => {
  const { main, first, second, third } = await workspace.createIssues(
    {
      main: { title: "키보드 주 작업", type: "task" },
      first: { title: "키보드 후보 하나", type: "task" },
      second: { title: "키보드 후보 둘", type: "task" },
      third: { title: "키보드 후보 셋", type: "task" },
    },
    [["main", "first"]],
  );

  await page.goto(`/issues?issue=${main}`);
  const dialog = page.getByRole("dialog", { name: `${main} 이슈` });
  const search = dialog.getByRole("combobox", { name: "연결할 이슈 찾기" });
  const candidates = dialog.getByRole("listbox", { name: "연결할 이슈 찾기" });

  await search.fill("키보드");
  const options = candidates.getByRole("option");
  await expect(options).toHaveCount(2);
  await expect(candidates.getByRole("option", { name: new RegExp(second) })).toBeVisible();
  await expect(candidates.getByRole("option", { name: new RegExp(third) })).toBeVisible();

  // bd의 수정 시각은 초 단위라, 연달아 만든 second와 third의 후보 순서는 정해지지 않습니다.
  // 순서에 기대지 않고, 화살표로 옮겨 간 두 번째 후보가 연결되는지 확인합니다.
  await search.press("ArrowDown");
  await expect(options.nth(1)).toHaveAttribute("aria-selected", "true");
  const picked = (await options.nth(1).textContent())?.includes(second) ? second : third;
  await search.press("Enter");

  await expect
    .poll(async () => dependenciesOf(workspace, main), { timeout: SAVE_TIMEOUT })
    .toEqual([`${first} blocks`, `${picked} blocks`].sort());
});

test("bd가 관계 맺기를 거부하면 상세에 오류가 보인다", async ({ page, workspace }) => {
  const { main, end } = await workspace.createIssues(
    {
      main: { title: "순환 주 작업", type: "task" },
      middle: { title: "순환 가운데 작업", type: "task" },
      end: { title: "순환 끝 작업", type: "task" },
    },
    [
      ["main", "middle"],
      ["middle", "end"],
    ],
  );

  await page.goto(`/issues?issue=${main}`);
  const dialog = page.getByRole("dialog", { name: `${main} 이슈` });
  await dialog.getByLabel("맺을 관계").selectOption({ label: "후속 이슈 (이 이슈가 끝나야 시작)" });
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
