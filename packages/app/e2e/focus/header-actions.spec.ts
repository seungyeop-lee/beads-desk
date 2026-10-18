import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";

test("에픽 진행률을 기다리지 않고 지금 화면을 보이고, 좁은 창의 헤더에서 화면 이동·설정·workspace 전환·새 이슈 만들기를 한다", async ({
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
  let releaseEpics = () => {};
  const heldEpics = new Promise<void>((resolve) => {
    releaseEpics = resolve;
  });
  await page.route("**/api/epics", async (route) => {
    await heldEpics;
    await route.continue();
  });
  const next = page.getByRole("region", { name: "다음에 할 일" });
  const screens = page.getByRole("navigation", { name: "화면" });
  const picker = page.getByRole("combobox", { name: "workspace", exact: true });
  const epicProgress = page.getByRole("region", {
    name: "에픽 진행률",
    exact: true,
  });
  await page.setViewportSize({ width: 480, height: 1000 });
  try {
    await page.goto("/");
    await expect(page).toHaveURL(/\/focus$/);
    await expect(next.getByRole("listitem")).toHaveCount(1);
    await expect(screens.getByRole("link", { name: "판단 기다림 1개", exact: true })).toBeVisible();
    await expect(picker).toHaveCount(1);
    await expect(epicProgress).toHaveCount(0);
  } finally {
    releaseEpics();
  }
  await expect(epicProgress).toBeVisible();
  await page.unroute("**/api/epics");

  for (const href of [
    "/human",
    "/issues",
    "/epics",
    "/hygiene",
    "/board",
    "/decisions",
    "/focus",
  ]) {
    await screens.locator(`a[href="${href}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
  }
  await page.getByRole("button", { name: "설정", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "설정" })).toBeVisible();
  await page.keyboard.press("Escape");

  const roots = await picker
    .locator("option")
    .evaluateAll((options) => options.map((option) => option.getAttribute("value")!));
  const other = roots.find((root) => root !== workspace.path)!;
  await picker.selectOption(other);
  await expect
    .poll(async () => (await (await page.request.get("/api/workspaces")).json()).data.current)
    .toBe(other);
  await picker.selectOption(workspace.path);
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

test("등록한 workspace가 하나뿐이면 헤더에 workspace 선택을 보이지 않는다", async ({
  page,
  workspace,
}) => {
  await page.route("**/api/workspaces", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.data.workspaces = [body.data.current];
    await route.fulfill({ response, json: body });
  });
  await page.goto("/focus");
  // 선택 대신 현재 workspace 이름만 보이면 목록을 받은 뒤입니다.
  await expect(page.getByTitle(workspace.path, { exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "workspace", exact: true })).toHaveCount(0);
});
