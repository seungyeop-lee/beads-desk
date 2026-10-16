import { writeFile } from "node:fs/promises";
import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";

const KOREAN_TITLE =
  "여러 단계와 여러 묶음으로 나눈 작업에서도 긴 한국어 제목의 마지막 글자까지 읽고 다음 작업으로 이어지는 선행 관계를 확인하도록 표시합니다";
const ENGLISH_TITLE =
  "Read every word of this long English issue title without opening its detail or hovering, while keeping different node heights and all dependency edges readable";

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 2560, height: 1410 },
]) {
  for (const shape of ["two", "groups"] as const) {
    for (const scope of ["epic", "center"] as const) {
      if (shape === "groups" && scope === "center") continue;
      test(`${viewport.width}×${viewport.height} ${scope} ${shape} 그래프는 모달 중앙에 배치하고 제목을 끝까지 보인다`, async ({
        page,
        workspace,
      }, testInfo) => {
        await page.setViewportSize(viewport);
        const ids = await workspace.createIssues<string>(
          {
            epic: { title: `${KOREAN_TITLE} ${ENGLISH_TITLE}`, type: "epic" },
            first: { title: KOREAN_TITLE, parent: "epic" },
            second: { title: ENGLISH_TITLE, parent: "epic" },
            ...(shape === "groups"
              ? {
                  third: { title: "세 번째 단계", parent: "epic" },
                  fourth: { title: "네 번째 단계", parent: "epic" },
                  otherFirst: { title: "다른 묶음 첫째", parent: "epic" },
                  otherSecond: { title: KOREAN_TITLE + " 다른 묶음 둘째", parent: "epic" },
                  alone: { title: "관계 없는 작업", parent: "epic" },
                }
              : {}),
          },
          [
            ["second", "first"],
            ...(shape === "groups"
              ? ([
                  ["third", "second"],
                  ["fourth", "third"],
                  ["otherSecond", "otherFirst"],
                ] as [string, string][])
              : []),
          ],
        );
        await page.goto(`/graph?${scope}=${scope === "epic" ? ids.epic : ids.second}`);
        const dialog = page.getByRole("dialog");
        const canvas = dialog.getByRole("region", { name: "의존 그래프" });
        const nodes = canvas.locator(".react-flow__node");
        await expect(nodes).toHaveCount(shape === "groups" ? 6 : 2);
        const title = dialog.getByRole("heading", { level: 1 });
        await expect(title).toHaveCSS("font-size", "16px");
        const close = dialog.getByRole("link", { name: "닫기", exact: true });
        await expect(close).toBeInViewport();
        const headerBox = (await title.boundingBox())!;
        const closeBox = (await close.boundingBox())!;
        expect(headerBox.x + headerBox.width).toBeLessThan(closeBox.x);
        const bounds = await canvas.evaluate((element) => {
          const box = element.getBoundingClientRect().toJSON();
          const nodeBoxes = [...element.querySelectorAll<HTMLElement>(".react-flow__node")].map(
            (node) => ({ id: node.dataset.id, ...node.getBoundingClientRect().toJSON() }),
          );
          const matrix = new DOMMatrixReadOnly(
            getComputedStyle(element.querySelector(".react-flow__viewport")!).transform,
          );
          return { canvas: box, nodes: nodeBoxes, zoom: matrix.a };
        });
        expect(bounds.zoom).toBeGreaterThanOrEqual(0.75);
        expect(bounds.zoom).toBeLessThanOrEqual(1.25);
        const left = Math.min(...bounds.nodes.map((node) => node.x));
        const right = Math.max(...bounds.nodes.map((node) => node.x + node.width));
        const top =
          Math.min(...bounds.nodes.map((node) => node.y)) -
          (scope === "epic" ? 32 * bounds.zoom : 0);
        const bottom = Math.max(...bounds.nodes.map((node) => node.y + node.height));
        expect((left + right) / 2).toBeCloseTo(bounds.canvas.x + bounds.canvas.width / 2, 0);
        expect((top + bottom) / 2).toBeCloseTo(bounds.canvas.y + bounds.canvas.height / 2, 0);
        for (let i = 0; i < bounds.nodes.length; i++)
          for (let j = i + 1; j < bounds.nodes.length; j++) {
            const a = bounds.nodes[i]!;
            const b = bounds.nodes[j]!;
            expect(
              a.x + a.width <= b.x ||
                b.x + b.width <= a.x ||
                a.y + a.height <= b.y ||
                b.y + b.height <= a.y,
            ).toBe(true);
          }
        for (const text of [KOREAN_TITLE, ENGLISH_TITLE]) {
          const textSize = await canvas.getByText(text, { exact: true }).evaluate((element) => ({
            height: element.clientHeight,
            content: element.scrollHeight,
            width: element.clientWidth,
            contentWidth: element.scrollWidth,
            lineHeight: parseFloat(getComputedStyle(element).lineHeight),
          }));
          expect(textSize.height).toBe(textSize.content);
          expect(textSize.width).toBe(textSize.contentWidth);
          expect(textSize.height).toBeGreaterThan(textSize.lineHeight * 2);
        }
        await writeFile(testInfo.outputPath("bounds.json"), JSON.stringify(bounds, null, 2));
        await page.screenshot({ path: testInfo.outputPath("graph.png") });
        if (shape === "groups") {
          const panel = dialog.getByRole("region", { name: "선후 관계 없음" });
          if (await panel.getByRole("button", { name: "선후 관계 없는 이슈 목록 펼치기" }).count())
            await panel.getByRole("button", { name: "선후 관계 없는 이슈 목록 펼치기" }).click();
          await expect(panel.getByRole("link", { name: /관계 없는 작업/ })).toBeVisible();
          await expect
            .poll(async () =>
              canvas.evaluate((element) => {
                const box = element.getBoundingClientRect();
                const nodes = [...element.querySelectorAll(".react-flow__node")].map((node) =>
                  node.getBoundingClientRect(),
                );
                const left = Math.min(...nodes.map((node) => node.x));
                const right = Math.max(...nodes.map((node) => node.right));
                return Math.abs((left + right) / 2 - (box.x + box.width / 2));
              }),
            )
            .toBeLessThan(1);
          await page.screenshot({ path: testInfo.outputPath("panel-open.png") });
        }
      });
    }
  }
}

test("출발 목록을 유지하고 그래프 상세를 편집하며 Escape·닫기·브라우저 뒤로가기로 원래 상세와 옆 패널을 복원한다", async ({
  page,
  workspace,
}, testInfo) => {
  const { first, second } = await workspace.createIssues(
    { first: { title: "모달 출발 선행" }, second: { title: "모달 출발 기준" } },
    [["second", "first"]],
  );
  const origin = `/issues?view=blocked&type=task&issue=${second}&side=${first}`;
  await page.goto(origin);
  await page
    .getByRole("dialog", { name: `${second} 이슈` })
    .getByRole("link", { name: "선행·후속 그래프" })
    .click();
  const graph = page.getByRole("dialog");
  const canvas = graph.getByRole("region", { name: "의존 그래프" });
  await expect(graph.getByRole("heading", { level: 1 })).toHaveText("모달 출발 기준 · 선행·후속");
  await expect(page).toHaveURL(
    (url) => url.pathname === "/issues" && url.searchParams.get("view") === "blocked",
  );
  await page.goBack();
  await expect(page).toHaveURL(origin);
  await expect(page.getByRole("region", { name: `${first} 이슈 옆 패널` })).toBeVisible();
  await page.goForward();
  await expect(canvas).toBeVisible();
  await page.reload();
  await expect(canvas.getByRole("link", { name: /모달 출발 선행/ })).toBeVisible();
  await canvas.getByRole("link", { name: /모달 출발 선행/ }).click();
  const detail = graph.getByRole("region", { name: `${first} 이슈`, exact: true });
  await expect(detail).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath("detail-open.png") });
  await detail.getByRole("button", { name: "모달 출발 선행", exact: true }).click();
  await detail.getByRole("textbox", { name: "제목", exact: true }).fill("그래프에서 수정한 제목");
  await detail.getByRole("button", { name: "저장", exact: true }).click();
  await expect
    .poll(async () => (await workspace.showIssue(first)).title, { timeout: SAVE_TIMEOUT })
    .toBe("그래프에서 수정한 제목");
  await page.screenshot({ path: testInfo.outputPath("detail-edit.png") });
  await detail.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(detail).toHaveCount(0);
  await expect(canvas.getByRole("link", { name: /그래프에서 수정한 제목/ })).toBeVisible();
  const viewport = canvas.locator(".react-flow__viewport");
  const originalZoom = await viewport.evaluate(
    (element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).a,
  );
  await canvas.getByRole("button", { name: "축소", exact: true }).click();
  await expect
    .poll(() =>
      viewport.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).a),
    )
    .toBeLessThan(originalZoom);
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.8);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 80, box.y + box.height * 0.8 - 40, { steps: 5 });
  await page.mouse.up();
  const before = await viewport.evaluate((element) => getComputedStyle(element).transform);
  await workspace.bd("update", first, "--title", KOREAN_TITLE);
  await expect(canvas.getByRole("link", { name: new RegExp(KOREAN_TITLE) })).toBeVisible();
  await expect(viewport).toHaveCSS("transform", before);
  await page.screenshot({ path: testInfo.outputPath("edited-side-panel.png") });
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(origin);
  await expect(page.getByRole("region", { name: `${first} 이슈 옆 패널` })).toBeVisible();
  await page
    .getByRole("dialog", { name: `${second} 이슈` })
    .getByRole("link", { name: "선행·후속 그래프" })
    .click();
  await expect(canvas).toBeVisible();
  await graph.getByRole("link", { name: "닫기", exact: true }).click();
  await expect(page).toHaveURL(origin);
  await expect(page.getByRole("region", { name: `${first} 이슈 옆 패널` })).toBeVisible();
});

test("에픽 상세에서 연 그래프를 닫고 다시 열거나 기존 주소를 새로고침해도 긴 제목을 끝까지 보인다", async ({
  page,
  workspace,
}) => {
  const { epic } = await workspace.createIssues(
    {
      epic: { title: "다시 여는 에픽", type: "epic" },
      first: { title: KOREAN_TITLE, parent: "epic" },
      second: { title: ENGLISH_TITLE, parent: "epic" },
    },
    [["second", "first"]],
  );
  const origin = `/epics?issue=${epic}`;
  await page.goto(origin);
  for (let visit = 0; visit < 2; visit++) {
    await page
      .getByRole("dialog", { name: `${epic} 이슈` })
      .getByRole("link", { name: "순서 보기" })
      .click();
    const graph = page.getByRole("dialog");
    const canvas = graph.getByRole("region", { name: "의존 그래프" });
    await expect(canvas.getByRole("link", { name: new RegExp(ENGLISH_TITLE) })).toBeVisible();
    const size = await canvas
      .getByText(ENGLISH_TITLE, { exact: true })
      .evaluate((element) => ({ height: element.clientHeight, content: element.scrollHeight }));
    expect(size.height).toBe(size.content);
    await graph.getByRole("link", { name: "닫기", exact: true }).click();
    await expect(page).toHaveURL(origin);
  }
  await page.goto(`/graph?epic=${epic}`);
  await page.reload();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("region", { name: "의존 그래프" })
      .getByRole("link", { name: new RegExp(ENGLISH_TITLE) }),
  ).toBeVisible();
});

test("이슈 갱신으로 선후 관계 없음 패널이 나타나도 사용자가 고른 pan·zoom을 유지한다", async ({
  page,
  workspace,
}) => {
  const { epic } = await workspace.createIssues(
    {
      epic: { title: "갱신 중 위치 유지", type: "epic" },
      first: { title: "위치 유지 먼저", parent: "epic" },
      second: { title: "위치 유지 다음", parent: "epic" },
    },
    [["second", "first"]],
  );
  await page.goto(`/graph?epic=${epic}`);
  const canvas = page.getByRole("region", { name: "의존 그래프" });
  await expect(canvas.getByRole("link", { name: /위치 유지 다음/ })).toBeVisible();
  const viewport = canvas.locator(".react-flow__viewport");
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.8);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 70, box.y + box.height * 0.8 - 40, { steps: 5 });
  await page.mouse.up();
  const before = await viewport.evaluate((element) => getComputedStyle(element).transform);
  await workspace.createIssue("갱신으로 나타난 독립 작업", "--parent", epic);
  await expect(
    page
      .getByRole("region", { name: "선후 관계 없음" })
      .getByRole("link", { name: /갱신으로 나타난 독립 작업/ }),
  ).toBeVisible();
  await expect(viewport).toHaveCSS("transform", before);
});
