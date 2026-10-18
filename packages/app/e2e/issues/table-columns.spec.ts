import { expect, test } from "../support/bdWorkspace";

/** 시나리오 workspace의 prefix는 `e2e`이므로 화면에는 `e2e-` 뒤만 보입니다. */
function shortId(id: string) {
  return id.replace(/^e2e-/, "");
}

test("이슈 표, 에픽, 결정, 지금 화면, 보드는 ID를 prefix 없이 보이고, 전체 ID를 복사 단추의 이름으로 알려 준다", async ({
  page,
  workspace,
}) => {
  const { epic, doing, next, decision } = await workspace.createIssues({
    epic: { title: "묶음 에픽", type: "epic" },
    doing: {
      title: "e2e 진행하는 작업",
      type: "task",
      parent: "epic",
      status: "in_progress",
      assignee: "minji",
    },
    next: { title: "e2e 다음 작업", type: "task" },
    decision: { title: "e2e 결정", type: "decision" },
  });

  await page.goto("/issues");
  const row = page.getByRole("row").filter({ hasText: "e2e 진행하는 작업" });
  await expect(row.getByRole("button", { name: `${doing} ID 복사` })).toHaveText(shortId(doing));
  // 이슈 표의 담당자는 고칠 수 없는 글자로 보이고, 상태와 우선순위만 표에서 고칩니다.
  const assignee = row.getByRole("cell", { name: "minji", exact: true });
  await expect(assignee).toBeVisible();
  await expect(assignee.getByRole("button")).toHaveCount(0);
  await expect(row.getByRole("textbox")).toHaveCount(0);
  await expect(row.getByRole("combobox", { name: `${doing} 상태` })).toBeEnabled();
  await expect(row.getByRole("combobox", { name: `${doing} 우선순위` })).toBeEnabled();

  const copyButton = (id: string) => page.getByRole("button", { name: `${id} ID 복사` });
  await page.goto("/epics");
  await expect(copyButton(epic)).toHaveText(shortId(epic));
  await expect(copyButton(doing)).toHaveText(shortId(doing));

  await page.goto("/decisions");
  await expect(copyButton(decision)).toHaveText(shortId(decision));

  await page.goto("/focus");
  for (const [region, id] of [
    ["진행 중", doing],
    ["다음에 할 일", next],
  ]) {
    await expect(
      page
        .getByRole("region", { name: region, exact: true })
        .getByRole("button", { name: `${id} ID 복사` }),
    ).toHaveText(shortId(id));
  }

  await page.goto("/board");
  await expect(copyButton(next)).toHaveText(shortId(next));
});
