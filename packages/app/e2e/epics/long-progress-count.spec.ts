import type { Locator } from "@playwright/test";
import { expect, test } from "../support/bdWorkspace";

// 좁은 두 창의 크기는 narrow-header.spec.ts와 같습니다. 넓은 창에서는 에픽 헤더가 xl 배치로 한 줄에 놓입니다.
const WINDOWS = [
  { name: "Chrome 110%에서 가장 좁힌 창", width: 455, deviceScaleFactor: 1.1 },
  { name: "Chrome 100%에서 가장 좁힌 창", width: 500, deviceScaleFactor: 1 },
  { name: "넓은 창", width: 1440, deviceScaleFactor: 1 },
];

for (const { name, width, deviceScaleFactor } of WINDOWS) {
  test.describe(name, () => {
    test.use({ viewport: { width, height: 900 }, deviceScaleFactor });

    test("하위 이슈가 두 자리·세 자리인 에픽의 진행 개수가 한 줄로 카드 안에 보인다", async ({
      page,
      workspace,
    }) => {
      await workspace.createIssues({
        ten: { title: "하위 이슈 열 개 에픽", type: "epic" },
        hundred: { title: "하위 이슈 백 개 에픽", type: "epic" },
        ...closedChildren("ten", 10),
        ...closedChildren("hundred", 100),
      });

      await page.goto("/epics");
      for (const [title, countText] of [
        ["하위 이슈 열 개 에픽", "10/10 · 100%"],
        ["하위 이슈 백 개 에픽", "100/100 · 100%"],
      ]) {
        const card = page.getByRole("main").locator("section.surface").filter({ hasText: title });
        const count = card.getByText(countText, { exact: true });
        await expect(count).toBeVisible();
        expect(await lineCount(count)).toBe(1);
        const cardBox = (await card.boundingBox())!;
        const countBox = (await count.boundingBox())!;
        expect(countBox.x).toBeGreaterThanOrEqual(cardBox.x);
        expect(countBox.x + countBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      ).toBe(0);
    });
  });
}

function closedChildren(parent: string, count: number) {
  return Object.fromEntries(
    Array.from({ length: count }, (_, index) => [
      `${parent}-${index}`,
      { title: `${parent} 하위 작업 ${index}`, parent, status: "closed" },
    ]),
  );
}

/**
 * 글자가 몇 줄에 나뉘어 놓였는지 셉니다.
 * 칸이 글자보다 좁으면 글자가 칸 밖으로 넘치지 않고 다음 줄로 넘어가므로, 상자 경계만 비교해서는 이 상태를 찾지 못합니다.
 */
async function lineCount(element: Locator) {
  return element.evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size;
  });
}
