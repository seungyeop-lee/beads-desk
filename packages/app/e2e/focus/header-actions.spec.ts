import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";

test("좁은 창의 헤더에서 화면 탭으로 이동하고, workspace를 새 탭으로 열고 바꿨다 되돌리고, 새 이슈를 만든다", async ({
  page,
  workspace,
}) => {
  await workspace.createIssues(
    {
      doing: { title: "진행 중인 작업", type: "task", status: "in_progress" },
      next: { title: "다음에 할 작업", type: "task" },
      waiting: { title: "다음 작업을 기다리는 작업", type: "task" },
      human: { title: "판단할 작업", type: "task", labels: ["human"] },
    },
    [["waiting", "next"]],
  );
  const next = page.getByRole("region", { name: "바로 작업 가능", exact: true });
  const screens = page.getByRole("navigation", { name: "화면" });
  const picker = page.getByRole("button", { name: "이 탭의 workspace", exact: true });
  await page.setViewportSize({ width: 480, height: 1000 });
  await page.goto(".");
  await expect(page).toHaveURL(/\/focus$/);
  await expect(screens.getByRole("link", { name: "판단 기다림 1개", exact: true })).toBeVisible();

  for (const href of [
    "/human",
    "/issues",
    "/epics",
    "/hygiene",
    "/board",
    "/decisions",
    "/focus",
  ]) {
    await screens.locator(`a[href="/w/${workspace.slug}${href}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
  }

  // 다른 workspace의 새 탭 단추는 같은 화면을 새 탭에서 열고, 이 탭은 보던 workspace에 그대로 둡니다.
  await picker.click();
  const newTab = page.getByRole("link", { name: /^새 탭에서 .+ 열기$/ }).first();
  const other = (await newTab.getAttribute("href"))!.split("/")[2]!;
  const opened = page.context().waitForEvent("page");
  await newTab.click();
  const otherTab = await opened;
  await expect(otherTab).toHaveURL(new RegExp(`/w/${other}/focus$`));
  await otherTab.close();
  await expect(page).toHaveURL(new RegExp(`/w/${workspace.slug}/focus$`));

  // workspace 이름을 고르면 이 탭만 그 workspace의 같은 화면으로 옮겨 갑니다.
  const header = page.getByRole("banner");
  await picker.click();
  await header.getByRole("link", { name: other, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/w/${other}/focus$`));
  await expect(picker).toHaveText(other);
  await picker.click();
  await header.getByRole("link", { name: workspace.slug, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/w/${workspace.slug}/focus$`));
  await expect(next.getByRole("listitem")).toHaveCount(1);

  await page.getByRole("button", { name: "새 이슈", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "새 이슈" });
  await dialog.getByRole("textbox", { name: "제목", exact: true }).fill("좁은 화면에서 만든 작업");
  await dialog.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/focus\?issue=/);
  const created = new URL(page.url()).searchParams.get("issue")!;
  await expect
    .poll(() => workspace.showIssue(created).then((issue) => issue.title), {
      timeout: SAVE_TIMEOUT,
    })
    .toBe("좁은 화면에서 만든 작업");
  expect((await workspace.showIssue(created)).parent).toBeUndefined();
});
