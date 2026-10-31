import { expect, test } from "../support/bdWorkspace";

// 브라우저도 같은 컴퓨터의 시간대를 쓰므로, 화면이 보는 오늘과 같은 날짜입니다.
const now = new Date();
const pad = (value: number) => String(value).padStart(2, "0");
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const todayName = `${now.getMonth() + 1}월 ${now.getDate()}일`;

test("이슈를 만들고 닫으면 흐름 통계의 오늘 막대가 바뀐다", async ({ page, workspace }) => {
  await page.goto("focus");
  const stats = page.getByRole("region", { name: "흐름" });
  // 흐름 통계는 이슈 목록을 읽은 뒤에 그려지므로, 보인 뒤에 만든 이슈는 서버 알림으로 다시 읽어야 막대에 나타납니다.
  await expect(stats).toBeVisible();

  const id = await workspace.createIssue("새로 만든 작업", "--type", "task");
  await expect(
    stats.getByRole("link", { name: `${todayName}에 만든 이슈 1개 보기` }),
  ).toBeVisible();
  await expect(stats.getByRole("link", { name: /닫은 이슈/ })).toHaveCount(0);

  await workspace.bd("close", id);
  await expect(
    stats.getByRole("link", { name: `${todayName}에 닫은 이슈 1개 보기` }),
  ).toBeVisible();
});

test("흐름 통계의 오늘 막대와 요약 칩의 보류 수, 닫을 수 있는 에픽 수를 누르면 오늘 닫거나 만든 이슈의 조건으로 연 이슈 목록, 보류 보기 탭, 그 에픽을 모은 정리 페이지를 연다", async ({
  page,
  workspace,
}) => {
  // 하위 없는 에픽은 닫을 수 있는 에픽이 아니므로, 정리 페이지에는 다 끝난 에픽 하나만 보입니다.
  await workspace.createIssues({
    later: { title: "미룬 작업", type: "task", status: "deferred" },
    epic: { title: "다 끝난 에픽", type: "epic" },
    child: { title: "끝난 하위 작업", type: "task", parent: "epic", status: "closed" },
    empty: { title: "하위 없는 에픽", type: "epic" },
  });

  await page.goto("focus");
  const stats = page.getByRole("region", { name: "흐름" });
  await stats.getByRole("link", { name: new RegExp(`^${todayName}에 닫은 이슈`) }).click();
  await expect(page).toHaveURL(
    new RegExp(`/issues\\?view=closed&date=closed&from=${today}&to=${today}&type=`),
  );

  await page.goBack();
  await stats.getByRole("link", { name: new RegExp(`^${todayName}에 만든 이슈`) }).click();
  await expect(page).toHaveURL(new RegExp(`/issues\\?from=${today}&to=${today}&type=`));

  await page.goBack();
  const summary = page.getByRole("navigation", { name: "개수 요약" });
  await summary.getByRole("link", { name: /^보류/ }).click();
  await expect(page).toHaveURL(/\/issues\?view=deferred$/);
  await expect(page.getByRole("link", { name: "미룬 작업" })).toBeVisible();

  await page.goBack();
  await summary.getByRole("link", { name: /^닫을 수 있는 에픽/ }).click();
  await expect(page).toHaveURL(/\/hygiene$/);
  const closable = page.getByRole("region", { name: "닫을 수 있는 에픽" });
  await expect(closable.getByRole("listitem")).toHaveCount(1);
  await expect(closable.getByRole("link", { name: /다 끝난 에픽/ })).toBeVisible();
});
