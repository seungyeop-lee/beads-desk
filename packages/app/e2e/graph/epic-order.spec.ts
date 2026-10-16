import { expect, test } from "../support/bdWorkspace";

test("상단 탭에는 그래프가 없고, 에픽 화면의 순서 보기는 그 에픽의 후손 이슈를 blocks 순서대로 왼쪽부터 그리며 닫힌 후손 이슈는 흐리게, blocks 관계가 없는 후손 이슈는 선후 관계 없음에 보인다", async ({
  page,
  workspace,
}) => {
  const { epic, third } = await workspace.createIssues(
    {
      epic: { title: "순서 에픽", type: "epic" },
      feature: { title: "순서 기능", type: "feature", parent: "epic" },
      first: { title: "순서 첫째", parent: "epic", status: "closed" },
      second: { title: "순서 둘째", parent: "epic" },
      third: { title: "순서 셋째", parent: "feature" },
      alone: { title: "순서 관계 없음", parent: "epic" },
      outside: { title: "에픽 밖 후속" },
    },
    [
      ["second", "first"],
      ["third", "second"],
      ["outside", "second"],
    ],
  );

  await page.goto("/epics");
  await expect(
    page.getByRole("navigation", { name: "화면" }).getByRole("link", { name: "에픽" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "화면" }).getByRole("link", { name: "그래프" }),
  ).toHaveCount(0);

  await page
    .locator("section")
    .filter({ hasText: "순서 에픽" })
    .getByRole("link", { name: "순서 보기" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/graph\\?epic=${epic}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("순서 에픽 · 순서");

  const canvas = page.getByRole("region", { name: "의존 그래프" });
  const node = (title: string) => canvas.getByRole("link", { name: new RegExp(title) });
  await expect(node("순서 셋째")).toBeVisible();
  await expect(node("에픽 밖 후속")).toHaveCount(0);
  await expect(node("순서 관계 없음")).toHaveCount(0);
  const unordered = page.getByRole("region", { name: "선후 관계 없음" });
  await expect(unordered.getByRole("link", { name: /순서 관계 없음/ })).toBeVisible();
  await expect(unordered.getByRole("link", { name: /순서 기능/ })).toBeVisible();
  await expect(unordered.getByRole("link", { name: /에픽 밖 후속/ })).toHaveCount(0);

  const left = async (title: string) => (await node(title).boundingBox())!.x;
  const [x1, x2, x3] = [await left("순서 첫째"), await left("순서 둘째"), await left("순서 셋째")];
  expect(x1).toBeLessThan(x2);
  expect(x2).toBeLessThan(x3);
  await expect(node("순서 첫째")).toHaveCSS("opacity", "0.5");
  await expect(node("순서 둘째")).toHaveCSS("opacity", "1");

  await node("순서 셋째").click();
  await expect(page.getByRole("dialog", { name: `${third} 이슈` })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`epic=${epic}&issue=${third}$`));
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(new RegExp(`/graph\\?epic=${epic}$`));
  await expect(node("순서 셋째")).toBeVisible();
});

test("그래프 머리글의 에픽 제목은 에픽 상세를 열고, 에픽 상세의 순서 보기로 같은 그래프를 다시 연다", async ({
  page,
  workspace,
}) => {
  const { epic } = await workspace.createIssues(
    {
      epic: { title: "머리글 에픽", type: "epic" },
      first: { title: "머리글 먼저", parent: "epic" },
      second: { title: "머리글 나중", parent: "epic" },
    },
    [["second", "first"]],
  );

  await page.goto(`/graph?epic=${epic}`);
  await page.getByRole("heading", { level: 1 }).getByRole("link", { name: "머리글 에픽" }).click();
  const dialog = page.getByRole("dialog", { name: `${epic} 이슈` });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("link", { name: "선행·후속 그래프" })).toHaveCount(0);

  await dialog.getByRole("link", { name: "순서 보기" }).click();
  await expect(page).toHaveURL(new RegExp(`/graph\\?epic=${epic}$`));
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "의존 그래프" }).getByRole("link", { name: /머리글 나중/ }),
  ).toBeVisible();
});

test("그래프 영역은 화면 높이 안에 들어가 페이지가 세로로 스크롤되지 않는다", async ({
  page,
  workspace,
}) => {
  const { epic } = await workspace.createIssues(
    {
      epic: { title: "높이 에픽", type: "epic" },
      first: { title: "높이 첫째", parent: "epic" },
      second: { title: "높이 둘째", parent: "epic" },
    },
    [["second", "first"]],
  );
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.goto(`/graph?epic=${epic}`);
  const canvas = page.getByRole("region", { name: "의존 그래프" });
  await expect(canvas.getByRole("link", { name: /높이 둘째/ })).toBeVisible();

  expect(
    (await canvas.boundingBox())!.y + (await canvas.boundingBox())!.height,
  ).toBeLessThanOrEqual(720);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(720);
});
