import { expect, test } from "../support/bdWorkspace";

test("첫 화면은 지금 화면이고, 개수 카드와 모두 보기는 이슈 목록의 같은 보기 탭을 열며, 병목 후보는 선행·후속 그래프를 열고 다른 workspace의 병목과 섞이지 않는다", async ({
  page,
  context,
  appServerUrl,
  workspace,
  otherWorkspace,
}) => {
  // 모두 보기는 바로 작업 가능한 이슈가 다음에 할 일에 보이는 5개보다 많을 때만 생깁니다.
  const { first } = await workspace.createIssues(
    {
      first: { title: "작업 하나", type: "task" },
      second: { title: "작업 둘", type: "task" },
      third: { title: "작업 셋", type: "task" },
      fourth: { title: "작업 넷", type: "task" },
      fifth: { title: "작업 다섯", type: "task" },
      sixth: { title: "작업 여섯", type: "task" },
      waiting: { title: "기다리는 작업", type: "task" },
    },
    [["waiting", "first"]],
  );
  await otherWorkspace.createIssues(
    {
      prior: { title: "다른 workspace의 선행 작업", type: "task" },
      after: { title: "다른 workspace의 후속 작업", type: "task" },
    },
    [["after", "prior"]],
  );

  await page.goto(".");
  await expect(page).toHaveURL(/\/focus$/);
  await expect(page.getByRole("link", { name: "지금" })).toHaveAttribute("aria-current", "page");
  const nextUp = page.getByRole("region", { name: "다음에 할 일" });
  const tabs = page.getByRole("navigation", { name: "보기" });
  await nextUp.getByRole("link", { name: /모두 보기/ }).click();
  await expect(page).toHaveURL(/\/issues\?view=ready$/);
  await expect(tabs.getByRole("link", { name: "바로 작업 가능 6" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.goBack();
  await expect(page).toHaveURL(/\/focus$/);
  await page.getByRole("link", { name: "막힘 1", exact: true }).click();
  await expect(page).toHaveURL(/\/issues\?view=blocked$/);
  await expect(tabs.getByRole("link", { name: "막힘 1" })).toHaveAttribute("aria-current", "page");

  await page.goto("focus");
  const bottlenecks = page.getByRole("region", { name: "병목", exact: true });
  await expect(bottlenecks.getByRole("listitem")).toHaveCount(1);
  await expect(bottlenecks.getByRole("link", { name: /다른 workspace/ })).toHaveCount(0);
  await bottlenecks.getByRole("link", { name: `${first}의 선행·후속 그래프 열기` }).click();
  await expect(page).toHaveURL(new RegExp(`/focus\\?center=${first}&returnTo=%2Ffocus$`));
  const canvas = page.getByRole("region", { name: "의존 그래프" });
  await expect(canvas.getByRole("link", { name: /기다리는 작업/ })).toBeVisible();
  // 병목 후보를 보거나 그래프를 열기만 해서는 bd에 저장된 상태와 우선순위가 바뀌지 않습니다.
  const shown = await workspace.showIssue(first);
  expect([shown.status, shown.priority]).toEqual(["open", 2]);

  const otherPage = await context.newPage();
  await otherPage.goto(`${appServerUrl}/w/${otherWorkspace.slug}/focus`);
  const otherBottlenecks = otherPage.getByRole("region", { name: "병목", exact: true });
  await expect(otherBottlenecks.getByRole("listitem")).toHaveCount(1);
  await expect(
    otherBottlenecks.getByRole("link", { name: /다른 workspace의 선행 작업/ }),
  ).toBeVisible();
});

test("지금 화면의 줄을 누르면 그 위에 상세가 열리고, 닫으면 지금 화면으로 돌아온다", async ({
  page,
  workspace,
}) => {
  const { doing } = await workspace.createIssues({
    doing: { title: "진행하는 작업", type: "task", status: "in_progress" },
  });

  await page.goto("focus");
  await page.getByRole("region", { name: "진행 중", exact: true }).getByRole("link").click();
  await expect(page.getByRole("dialog", { name: `${doing} 이슈` })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/focus\\?issue=${doing}$`));
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/focus$/);
});
