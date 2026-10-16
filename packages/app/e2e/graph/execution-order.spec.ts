import { expect, test } from "../support/bdWorkspace";

test("blocks로 이어진 이슈는 실행 순서 탭에서 먼저 할 것부터 왼쪽에 놓이고, 노드를 누르면 상세가 열린다", async ({
  page,
  workspace,
}) => {
  const { third } = await workspace.createIssues(
    {
      first: { title: "그래프 첫째" },
      second: { title: "그래프 둘째" },
      third: { title: "그래프 셋째" },
      alone: { title: "그래프 관계 없음" },
    },
    [
      ["second", "first"],
      ["third", "second"],
    ],
  );

  await page.goto("/graph");
  const canvas = page.getByRole("region", { name: "의존 그래프" });
  const node = (title: string) => canvas.getByRole("link", { name: new RegExp(title) });
  await expect(node("그래프 셋째")).toBeVisible();
  await expect(node("그래프 셋째").getByText("작업", { exact: true })).toBeVisible();
  await expect(node("그래프 관계 없음")).toHaveCount(0);
  await expect(page.getByText("blocks 관계가 없는 이슈 1개는 그리지 않았습니다.")).toBeVisible();
  await expect(page.getByRole("button", { name: /먼저 끝내야 하는 이슈를 왼쪽에/ })).toBeVisible();

  const left = async (title: string) => (await node(title).boundingBox())!.x;
  const [x1, x2, x3] = [
    await left("그래프 첫째"),
    await left("그래프 둘째"),
    await left("그래프 셋째"),
  ];
  expect(x1).toBeLessThan(x2);
  expect(x2).toBeLessThan(x3);

  await node("그래프 셋째").click();
  await expect(page.getByRole("dialog", { name: `${third} 이슈` })).toBeVisible();
});

test("상위 에픽 필터는 그 에픽의 후손만 그리고, 고른 필터는 새로고침 뒤에도 남는다", async ({
  page,
  workspace,
}) => {
  const { epic } = await workspace.createIssues(
    {
      epic: { title: "필터 에픽", type: "epic" },
      inside1: { title: "에픽 안 먼저", parent: "epic" },
      inside2: { title: "에픽 안 나중", parent: "epic" },
      outside1: { title: "에픽 밖 먼저" },
      outside2: { title: "에픽 밖 나중" },
    },
    [
      ["inside2", "inside1"],
      ["outside2", "outside1"],
    ],
  );

  await page.goto("/graph");
  const canvas = page.getByRole("region", { name: "의존 그래프" });
  await expect(canvas.getByRole("link", { name: /에픽 밖 나중/ })).toBeVisible();

  await page.getByRole("combobox", { name: "상위 에픽" }).selectOption(epic);
  await expect(page).toHaveURL(new RegExp(`epic=${epic}`));
  await expect(canvas.getByRole("link", { name: /에픽 밖 나중/ })).toHaveCount(0);
  await expect(canvas.getByRole("link", { name: /에픽 안 나중/ })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("combobox", { name: "상위 에픽" })).toHaveValue(epic);
  await expect(canvas.getByRole("link", { name: /에픽 안 나중/ })).toBeVisible();
  await expect(canvas.getByRole("link", { name: /에픽 밖 나중/ })).toHaveCount(0);
});

test("그래프 영역은 화면 높이 안에 들어가 페이지가 세로로 스크롤되지 않는다", async ({
  page,
  workspace,
}) => {
  await workspace.createIssues({ first: { title: "높이 첫째" }, second: { title: "높이 둘째" } }, [
    ["second", "first"],
  ]);
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.goto("/graph");
  const canvas = page.getByRole("region", { name: "의존 그래프" });
  await expect(canvas.getByRole("link", { name: /높이 둘째/ })).toBeVisible();

  expect(
    (await canvas.boundingBox())!.y + (await canvas.boundingBox())!.height,
  ).toBeLessThanOrEqual(720);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(720);
});
