import { expect, test } from "../support/bdWorkspace";

test("에픽 순서 보기는 열마다 단계 이름과 위쪽의 진행 요약을 보이고, 후손 이슈를 막는 에픽 밖 이슈를 점선 노드로, 노드마다 대기 수를 보이며, 이슈 중심 보기의 기준 노드 강조는 없다", async ({
  page,
  workspace,
}) => {
  const {
    epic,
    first,
    third,
    outside: outsideId,
  } = await workspace.createIssues(
    {
      epic: { title: "계획 에픽", type: "epic" },
      first: { title: "계획 첫째", parent: "epic", status: "closed" },
      second: { title: "계획 둘째", parent: "epic" },
      third: { title: "계획 셋째", parent: "epic" },
      fourth: { title: "계획 넷째", parent: "epic" },
      outside: { title: "계획 밖 선행" },
      loose: { title: "계획 순서 없음", parent: "epic" },
    },
    [
      ["second", "first"],
      ["third", "second"],
      ["fourth", "third"],
      ["outside", "first"],
      ["third", "outside"],
    ],
  );

  await page.goto(`/graph?epic=${epic}`);
  const canvas = page.getByRole("region", { name: "의존 그래프" });
  const node = (title: string) => canvas.getByRole("link", { name: new RegExp(title) });
  await expect(node("계획 넷째")).toBeVisible();

  await expect(page.getByText("전체 4단계 중 2단계 진행 중")).toBeVisible();
  await expect(canvas.getByText("1단계 · 완료")).toBeVisible();
  const current = canvas.getByText("2단계 · 진행 중");
  await expect(current).toBeVisible();
  await expect(canvas.getByText("3단계", { exact: true })).toBeVisible();
  await expect(canvas.getByText("4단계", { exact: true })).toBeVisible();
  expect((await current.boundingBox())!.x).toBeCloseTo(
    (await node("계획 둘째").boundingBox())!.x,
    0,
  );

  const outside = node("계획 밖 선행");
  await expect(outside).toContainText("에픽 밖");
  await expect(outside).toHaveCSS("border-top-style", "dashed");
  await expect(node("계획 둘째")).not.toContainText("에픽 밖");
  await expect(canvas.getByLabel(`${first} 다음에 ${outsideId}`)).toHaveCount(1);
  await expect(canvas.getByLabel(`${outsideId} 다음에 ${third}`)).toHaveCount(1);

  await expect(node("계획 둘째")).toContainText("2개 대기");
  await expect(outside).toContainText("2개 대기");
  await expect(node("계획 넷째")).not.toContainText("대기");
  await expect(canvas.locator("[aria-current]")).toHaveCount(0);

  const unordered = page.getByRole("region", { name: "선후 관계 없음" });
  await unordered.getByRole("button", { name: "선후 관계 없는 이슈 목록 펼치기" }).click();
  await expect(unordered.getByRole("link", { name: /계획 순서 없음/ })).toBeVisible();
  await expect(node("계획 순서 없음")).toHaveCount(0);
});

test("선후 관계 없음 목록은 긴 제목을 끝까지 보이고, 행을 누르면 상세를 열며, 그래프 노드도 제목을 끝까지 보인다", async ({
  page,
  workspace,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const longTitle =
    "에픽 안의 다른 이슈와 선후 관계가 없는 긴 제목도 목록에서 마지막 글자까지 빠짐없이 확인하고 독립적으로 작업을 진행할 수 있도록 표시합니다";
  const { epic, alone } = await workspace.createIssues(
    {
      epic: { title: "긴 제목 표시 확인", type: "epic" },
      first: { title: longTitle, parent: "epic", status: "closed" },
      second: { title: "연결된 다음 작업", parent: "epic" },
      alone: { title: longTitle, parent: "epic" },
      closed: { title: "완료한 독립 작업", parent: "epic", status: "closed" },
      outside: { title: "에픽 밖에서 기다리는 작업" },
    },
    [
      ["second", "first"],
      ["outside", "alone"],
    ],
  );
  await page.goto(`/graph?epic=${epic}`);
  const panel = page.getByRole("region", { name: "선후 관계 없음" });
  await expect(
    panel.getByText("에픽 안의 다른 이슈와 blocks 관계가 없는 이슈입니다."),
  ).toBeVisible();
  await expect(panel).toHaveCSS("width", "320px");
  const row = panel.getByRole("link", { name: new RegExp(longTitle) });
  const title = row.getByText(longTitle, { exact: true });
  await expect(title).toBeVisible();
  const size = await title.evaluate((el) => ({
    height: el.clientHeight,
    contentHeight: el.scrollHeight,
    width: el.clientWidth,
    contentWidth: el.scrollWidth,
    lineHeight: Number.parseFloat(getComputedStyle(el).lineHeight),
  }));
  expect(size.height).toBe(size.contentHeight);
  expect(size.width).toBe(size.contentWidth);
  expect(size.height).toBeGreaterThan(size.lineHeight * 2);
  await expect(row).toContainText("1개 대기");
  await expect(row).toContainText(alone.slice(alone.lastIndexOf("-") + 1));
  await expect(panel.getByRole("link", { name: /완료한 독립 작업/ })).toHaveCSS("opacity", "0.5");

  const node = page
    .getByRole("region", { name: "의존 그래프" })
    .getByRole("link", { name: new RegExp(longTitle) });
  await expect(node).toHaveCSS("width", "280px");
  const nodeTitle = node.getByText(longTitle, { exact: true });
  const nodeSize = await nodeTitle.evaluate((el) => ({
    height: el.clientHeight,
    contentHeight: el.scrollHeight,
    lineHeight: Number.parseFloat(getComputedStyle(el).lineHeight),
  }));
  expect(nodeSize.height).toBeGreaterThan(nodeSize.lineHeight * 2);
  expect(nodeSize.contentHeight).toBe(nodeSize.height);
  await testInfo.attach("title-measurements", {
    body: JSON.stringify({ panelTitle: size, nodeTitle: nodeSize }),
    contentType: "application/json",
  });
  await page.screenshot({ path: testInfo.outputPath("long-title-ko.png") });

  await row.click();
  await expect(page.getByRole("region", { name: `${alone} 이슈` })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL((url) => !url.searchParams.has("issue"));
  await page
    .context()
    .addCookies([{ name: "beads-desk-locale", value: "en", url: new URL(page.url()).origin }]);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const englishPanel = page.getByRole("region", { name: "No blocks dependency" });
  await expect(englishPanel.getByRole("heading", { name: /No blocks dependency/ })).toBeVisible();
  await expect(
    englishPanel.getByText("Issues with no blocks dependency on other issues in this epic."),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("long-title-en.png") });
});
