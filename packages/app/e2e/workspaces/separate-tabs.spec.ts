import { expect, test } from "../support/bdWorkspace";

test("서로 다른 workspace를 연 두 탭은 각자의 이슈를 보고, CLI로 바꾼 workspace를 연 탭만 다시 조회하며, SSE 연결 하나가 두 workspace를 함께 감시한다", async ({
  page,
  context,
  appServerUrl,
  workspace,
  otherWorkspace,
}) => {
  await workspace.createIssue("첫째 workspace의 작업");
  await otherWorkspace.createIssue("둘째 workspace의 작업");
  const events: string[] = [];
  context.on("request", (request) => {
    if (request.url().includes("/api/events")) events.push(request.url());
  });

  await page.goto("issues");
  await expect(page.getByRole("link", { name: "첫째 workspace의 작업" })).toBeVisible();
  const otherPage = await context.newPage();
  await otherPage.goto(`${appServerUrl}/w/${otherWorkspace.slug}/issues`);
  await expect(otherPage.getByRole("link", { name: "둘째 workspace의 작업" })).toBeVisible();
  await expect(otherPage.getByRole("link", { name: "첫째 workspace의 작업" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "둘째 workspace의 작업" })).toHaveCount(0);

  // 두 탭 가운데 SSE를 연 탭이 두 workspace를 함께 감시하도록 다시 연결합니다.
  const watchesBoth = (url: string) => {
    const watched = new URL(url).searchParams.getAll("workspace");
    return watched.includes(workspace.slug) && watched.includes(otherWorkspace.slug);
  };
  await expect.poll(() => events.some(watchesBoth)).toBe(true);

  let firstPageReads = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/issues") firstPageReads += 1;
  });
  await otherWorkspace.createIssue("CLI로 만든 둘째 workspace의 작업");
  await expect(
    otherPage.getByRole("link", { name: "CLI로 만든 둘째 workspace의 작업" }),
  ).toBeVisible();
  expect(firstPageReads).toBe(0);
  await expect(page.getByRole("link", { name: "CLI로 만든 둘째 workspace의 작업" })).toHaveCount(0);
});

test("서로 다른 workspace를 연 두 탭의 제목은 각자의 workspace 이름으로 시작하고, 같은 workspace 안에서 화면을 옮겨도 유지된다", async ({
  page,
  context,
  appServerUrl,
  workspace,
  otherWorkspace,
}) => {
  await page.goto("issues");
  await expect(page).toHaveTitle(`${workspace.slug} · beads-desk`);
  const otherPage = await context.newPage();
  await otherPage.goto(`${appServerUrl}/w/${otherWorkspace.slug}/issues`);
  await expect(otherPage).toHaveTitle(`${otherWorkspace.slug} · beads-desk`);

  await page.getByRole("navigation", { name: "화면" }).getByRole("link", { name: "보드" }).click();
  await expect(page).toHaveURL(/\/board$/);
  await expect(page).toHaveTitle(`${workspace.slug} · beads-desk`);
});

test("workspace 이름이 없는 예전 주소는 workspace를 고르게 하고, 고르면 같은 화면과 조건으로 옮겨 간다", async ({
  page,
  appServerUrl,
  workspace,
}) => {
  await workspace.createIssue("예전 주소로 찾는 작업", "--status", "in_progress");

  // e2e 서버는 시작할 때 받은 디렉터리와 시나리오의 workspace를 함께 등록하므로 workspace가 여럿입니다.
  await page.goto(`${appServerUrl}/issues?view=in_progress`);
  const choices = page.getByRole("list", { name: "workspace 고르기" });
  await choices.getByRole("link", { name: new RegExp(`^${workspace.slug}`) }).click();

  await expect(page).toHaveURL(new RegExp(`/w/${workspace.slug}/issues\\?view=in_progress$`));
  await expect(page.getByRole("link", { name: "예전 주소로 찾는 작업" })).toBeVisible();
});

test("등록하지 않은 workspace 이름의 주소는 안내를 보이고, 탭 제목에 workspace 이름을 넣지 않는다", async ({
  page,
  appServerUrl,
}) => {
  await page.goto(`${appServerUrl}/w/missing-workspace/issues`);

  await expect(page.getByRole("heading", { name: "workspace를 찾지 못했습니다" })).toBeVisible();
  await expect(
    page.getByText("'missing-workspace' 이름으로 등록한 workspace가 없습니다."),
  ).toBeVisible();
  await expect(page).toHaveTitle("beads-desk");
});
