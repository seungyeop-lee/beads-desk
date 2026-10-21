import { expect, SAVE_TIMEOUT, test, type BdWorkspace } from "../support/bdWorkspace";

test("고른 관계로 키보드만으로 후보를 골라 연결하면 bd에 그 관계가 저장된다", async ({
  page,
  workspace,
}) => {
  const { main, candidate } = await workspace.createIssues({
    main: { title: "키보드 주 작업", type: "task" },
    candidate: { title: "키보드 후보", type: "task" },
  });

  await page.goto(`issues?issue=${main}`);
  const dialog = page.getByRole("dialog", { name: `${main} 이슈` });
  const search = dialog.getByRole("combobox", { name: "연결할 이슈 찾기" });

  await dialog.getByLabel("맺을 관계").selectOption({ label: "후속 이슈 (이 이슈가 끝나야 시작)" });
  await search.fill("키보드 후보");
  await expect(
    dialog
      .getByRole("listbox", { name: "연결할 이슈 찾기" })
      .getByRole("option", { name: new RegExp(candidate) }),
  ).toBeVisible();
  await search.press("Enter");
  // 고르면 확인 버튼으로 포커스가 옮겨가, Enter를 한 번 더 눌러 연결합니다.
  await page.keyboard.press("Enter");

  await expect
    .poll(async () => dependenciesOf(workspace, candidate), { timeout: SAVE_TIMEOUT })
    .toEqual([`${main} blocks`]);
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

  await page.goto(`issues?issue=${main}`);
  const dialog = page.getByRole("dialog", { name: `${main} 이슈` });
  await dialog.getByLabel("맺을 관계").selectOption({ label: "후속 이슈 (이 이슈가 끝나야 시작)" });
  await dialog.getByRole("combobox", { name: "연결할 이슈 찾기" }).fill("순환 끝");
  await dialog
    .getByRole("listbox", { name: "연결할 이슈 찾기" })
    .getByRole("option", { name: new RegExp(end) })
    .click();
  await dialog.getByRole("button", { name: "연결" }).click();

  await expect(dialog.getByRole("alert")).toContainText("cycle");
});

async function dependenciesOf(workspace: BdWorkspace, id: string) {
  const issue = await workspace.showIssue(id);
  return (issue.dependencies ?? []).map((dep) => `${dep.id} ${dep.dependency_type}`).sort();
}
