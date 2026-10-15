import { expect, test } from "../support/bdWorkspace";

// 브라우저도 같은 컴퓨터의 시간대를 쓰므로, 화면이 보는 오늘과 같은 날짜입니다.
const now = new Date();
const pad = (value: number) => String(value).padStart(2, "0");
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const todayName = `${now.getMonth() + 1}월 ${now.getDate()}일`;

test("이슈를 만들고 착수해 닫으면 흐름 통계의 오늘 막대와 처리 시간이 바뀐다", async ({
  page,
  workspace,
}) => {
  await page.goto("/focus");
  const stats = page.getByRole("region", { name: "흐름" });
  await expect(stats.getByText("최근 7일 동안 닫은 이슈가 없습니다")).toHaveCount(2);

  const id = await workspace.createIssue("새로 만든 작업", "--type", "task");
  await expect(
    stats.getByRole("link", { name: `${todayName}에 만든 이슈 1개 보기` }),
  ).toBeVisible();
  await expect(stats.getByRole("link", { name: /닫은 이슈/ })).toHaveCount(0);

  await workspace.bd("update", id, "--claim");
  await workspace.bd("close", id);
  await expect(
    stats.getByRole("link", { name: `${todayName}에 닫은 이슈 1개 보기` }),
  ).toBeVisible();
  await expect(stats.getByText("중앙값 · 1개 기준")).toHaveCount(2);
});

test("오늘 막대를 누르면 이슈 목록에서 오늘 닫거나 만든 이슈를 막대와 같은 개수로 연다", async ({
  page,
  workspace,
}) => {
  await workspace.createIssues({
    done: { title: "오늘 끝낸 작업", type: "task", status: "closed" },
    open: { title: "열린 작업", type: "task" },
    epic: { title: "오늘 닫은 에픽", type: "epic", status: "closed" },
  });
  const tabs = page.getByRole("navigation", { name: "보기" });

  await page.goto("/focus");
  const stats = page.getByRole("region", { name: "흐름" });
  await stats.getByRole("link", { name: `${todayName}에 닫은 이슈 1개 보기` }).click();
  await expect(page).toHaveURL(
    new RegExp(`/issues\\?view=closed&date=closed&from=${today}&to=${today}&type=`),
  );
  await expect(page.getByRole("link", { name: "오늘 끝낸 작업" })).toBeVisible();
  await expect(page.getByRole("link", { name: "오늘 닫은 에픽" })).toHaveCount(0);
  await expect(tabs.getByRole("link", { name: "닫힘 1" })).toBeVisible();

  await page.goBack();
  await stats.getByRole("link", { name: `${todayName}에 만든 이슈 2개 보기` }).click();
  await expect(page).toHaveURL(new RegExp(`/issues\\?from=${today}&to=${today}&type=`));
  await expect(tabs.getByRole("link", { name: "전체 2" })).toBeVisible();
});

test("보류 수와 닫을 수 있는 에픽 수를 보이고, 누르면 보류 보기 탭과 에픽 화면을 연다", async ({
  page,
  workspace,
}) => {
  await workspace.createIssues({
    later: { title: "미룬 작업", type: "task", status: "deferred" },
    epic: { title: "다 끝난 에픽", type: "epic" },
    child: { title: "끝난 하위 작업", type: "task", parent: "epic", status: "closed" },
    empty: { title: "하위 없는 에픽", type: "epic" },
  });

  await page.goto("/focus");
  const stats = page.getByRole("region", { name: "흐름" });
  await stats.getByRole("link", { name: "보류 1" }).click();
  await expect(page).toHaveURL(/\/issues\?view=deferred$/);
  await expect(page.getByRole("link", { name: "미룬 작업" })).toBeVisible();

  await page.goBack();
  await stats.getByRole("link", { name: "닫을 수 있는 에픽 1" }).click();
  await expect(page).toHaveURL(/\/epics$/);
});
