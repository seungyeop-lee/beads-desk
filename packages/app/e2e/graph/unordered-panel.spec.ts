import { writeFile } from "node:fs/promises";
import { expect, test } from "../support/bdWorkspace";

test("4단계 에픽은 선후 관계 없음 목록을 접어 읽을 수 있는 크기의 노드를 중앙에 보이고, 사용자가 고른 펼침 상태를 갱신 뒤에도 유지한다", async ({
  page,
  workspace,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { epic, alone, fourth } = await workspace.createIssues(
    {
      epic: { title: "패널 공간 확인", type: "epic" },
      first: { title: "패널 첫 단계", parent: "epic" },
      second: { title: "패널 둘째 단계", parent: "epic" },
      third: { title: "패널 셋째 단계", parent: "epic" },
      fourth: { title: "패널 넷째 단계", parent: "epic" },
      alone: { title: "패널 독립 작업", parent: "epic" },
    },
    [
      ["second", "first"],
      ["third", "second"],
      ["fourth", "third"],
    ],
  );
  await page.goto(`/graph?epic=${epic}`);
  const canvas = page.getByRole("region", { name: "의존 그래프" });
  const panel = page.getByRole("region", { name: "선후 관계 없음" });
  const expand = panel.getByRole("button", { name: "선후 관계 없는 이슈 목록 펼치기" });
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  await expect(panel.getByRole("heading", { name: "선후 관계 없음 1" })).toBeVisible();
  await expect(panel.getByRole("link")).toHaveCount(0);
  const nodes = canvas.getByRole("link", { name: /패널 .*단계/ });
  await expect(nodes).toHaveCount(4);
  const canvasBox = (await canvas.boundingBox())!;
  const nodeBoxes = await Promise.all((await nodes.all()).map((node) => node.boundingBox()));
  for (const box of nodeBoxes) {
    expect(box!.x).toBeGreaterThanOrEqual(canvasBox.x);
    expect(box!.x + box!.width).toBeLessThanOrEqual(canvasBox.x + canvasBox.width);
    expect(box!.width).toBeGreaterThanOrEqual(280 * 0.75);
    expect(box!.width).toBeLessThanOrEqual(280 * 1.25);
  }
  const left = Math.min(...nodeBoxes.map((box) => box!.x));
  const right = Math.max(...nodeBoxes.map((box) => box!.x + box!.width));
  expect((left + right) / 2).toBeCloseTo(canvasBox.x + canvasBox.width / 2, 0);
  const transform = await canvas
    .locator(".react-flow__viewport")
    .evaluate((element) => getComputedStyle(element).transform);
  const zoom = Number(transform.match(/matrix\(([^,]+)/)![1]);
  const boundsPath = testInfo.outputPath("initial-bounds.json");
  await writeFile(boundsPath, JSON.stringify({ canvas: canvasBox, nodes: nodeBoxes, zoom }));
  await testInfo.attach("initial-bounds", { path: boundsPath, contentType: "application/json" });
  await page.screenshot({ path: testInfo.outputPath("four-stage-after.png") });

  await expand.focus();
  await page.keyboard.press("Enter");
  const collapse = panel.getByRole("button", { name: "선후 관계 없는 이슈 목록 접기" });
  await expect(collapse).toHaveAttribute("aria-expanded", "true");
  await expect(panel).toHaveCSS("width", "320px");
  await expect(panel.getByRole("link", { name: /패널 독립 작업/ })).toBeVisible();
  await workspace.bd("update", alone, "--title", "갱신한 독립 작업");
  await expect(panel.getByRole("link", { name: /갱신한 독립 작업/ })).toBeVisible();
  await expect(collapse).toHaveAttribute("aria-expanded", "true");
  await page.screenshot({ path: testInfo.outputPath("four-stage-expanded-ko.png") });

  await collapse.click();
  await workspace.bd("update", fourth, "--title", "갱신한 넷째 단계");
  await expect(canvas.getByRole("link", { name: /갱신한 넷째 단계/ })).toBeVisible();
  await expect(expand).toHaveAttribute("aria-expanded", "false");

  await page
    .context()
    .addCookies([{ name: "beads-desk-locale", value: "en", url: new URL(page.url()).origin }]);
  await page.reload();
  const englishPanel = page.getByRole("region", { name: "No blocks dependency" });
  await expect(englishPanel.getByRole("heading", { name: "No blocks dependency 1" })).toBeVisible();
  await englishPanel
    .getByRole("button", { name: "Expand issues with no blocks dependency" })
    .click();
  const englishCollapse = englishPanel.getByRole("button", {
    name: "Collapse issues with no blocks dependency",
  });
  await expect(englishCollapse).toHaveText("Collapse");
  await page.screenshot({ path: testInfo.outputPath("four-stage-expanded-en.png") });
  await englishCollapse.focus();
  await page.keyboard.press("Space");
  await expect(
    englishPanel.getByRole("button", { name: "Expand issues with no blocks dependency" }),
  ).toHaveText("Expand");
});

test("패널을 펼쳐도 들어가는 짧은 에픽은 목록을 펼쳐 시작하고, 선후 관계 없는 이슈가 없으면 패널 조작을 보이지 않는다", async ({
  page,
  workspace,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { epic, emptyEpic } = await workspace.createIssues(
    {
      epic: { title: "짧은 순서", type: "epic" },
      first: { title: "짧은 첫 단계", parent: "epic" },
      second: { title: "짧은 둘째 단계", parent: "epic" },
      alone: { title: "짧은 독립 작업", parent: "epic" },
      emptyEpic: { title: "독립 작업 없음", type: "epic" },
      linkedFirst: { title: "연결 첫 단계", parent: "emptyEpic" },
      linkedSecond: { title: "연결 둘째 단계", parent: "emptyEpic" },
    },
    [
      ["second", "first"],
      ["linkedSecond", "linkedFirst"],
    ],
  );
  await page.goto(`/graph?epic=${epic}`);
  const panel = page.getByRole("region", { name: "선후 관계 없음" });
  await expect(
    panel.getByRole("button", { name: "선후 관계 없는 이슈 목록 접기" }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(panel.getByRole("link", { name: /짧은 독립 작업/ })).toBeVisible();
  await expect(panel).toHaveCSS("width", "320px");

  await page.goto(`/graph?epic=${emptyEpic}`);
  await expect(
    page.getByRole("region", { name: "의존 그래프" }).getByRole("link", { name: /연결 둘째 단계/ }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "선후 관계 없음" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /선후 관계 없는 이슈 목록/ })).toHaveCount(0);
});
