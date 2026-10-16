import type { Locator } from "@playwright/test";
import { koMessages as messages } from "../../src/client/modules/locale/domain/koMessages";
import { expect, test } from "../support/bdWorkspace";

const TITLE = "bd CLI가 제공하지만 beads-desk 화면에 없는 이슈 처리·탐색·점검 기능을 화면에 더함";

// macOS Chrome은 창 바깥 너비를 500px보다 좁히지 못합니다.
// 확대율 110%에서는 이 창의 CSS viewport가 455px이 되어, 100%일 때의 500px보다 좁습니다.
const NARROWEST_WINDOWS = [
  { zoom: "100%", width: 500, deviceScaleFactor: 1 },
  { zoom: "110%", width: 455, deviceScaleFactor: 1.1 },
];

for (const { zoom, width, deviceScaleFactor } of NARROWEST_WINDOWS) {
  test.describe(`Chrome ${zoom}에서 가장 좁힌 창`, () => {
    test.use({ viewport: { width, height: 900 }, deviceScaleFactor });

    test("닫힌 에픽 헤더의 제목·진행률·조작이 카드 안에 있고 모두 동작한다", async ({
      page,
      workspace,
    }) => {
      const ids = await workspace.createIssues({
        epic: { title: TITLE, type: "epic", status: "closed" },
        ...Object.fromEntries(
          ["하나", "둘", "셋", "넷"].map((name) => [
            name,
            { title: `끝난 작업 ${name}`, parent: "epic", status: "closed" },
          ]),
        ),
      });
      const epicId = ids.epic!;

      await page.goto("/epics");
      const card = page.getByRole("main").locator("section.surface").filter({ hasText: TITLE });
      const titleLink = card.getByRole("link", { name: TITLE, exact: true });
      const count = card.getByText("4/4 · 100%", { exact: true });
      const toggle = card.getByRole("button", {
        name: messages.epics.toggleChildren(epicId, false),
      });
      const order = card.getByRole("link", { name: messages.graph.epicOrder, exact: true });
      await expect(count).toBeVisible();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");

      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      ).toBe(0);
      const cardBox = (await card.boundingBox())!;
      for (const part of [
        titleLink,
        toggle,
        card.getByLabel(messages.epics.progress(epicId)),
        count,
        order,
      ])
        await expectInside(part, cardBox);
      expect((await titleLink.boundingBox())!.width).toBeGreaterThanOrEqual(180);

      await toggle.click();
      await expect(card.getByRole("link", { name: "끝난 작업 하나", exact: true })).toBeVisible();
      await card.getByRole("button", { name: messages.epics.toggleChildren(epicId, true) }).click();
      await expect(card.getByRole("link", { name: "끝난 작업 하나", exact: true })).toHaveCount(0);

      await titleLink.click();
      const detail = page.getByRole("dialog", { name: messages.issueDetail.dialog(epicId) });
      await expect(detail).toBeVisible();
      await detail
        .getByRole("button", { name: messages.common.close, exact: true })
        .first()
        .click();
      await expect(detail).toHaveCount(0);

      await order.click();
      await expect(page).toHaveURL(new RegExp(`[?&]epic=${epicId}(?:&|$)`));
      const graph = page.getByRole("dialog");
      await expect(graph.getByRole("heading", { level: 1 })).toContainText(TITLE);
      await expect(graph).toContainText("끝난 작업 넷");
    });
  });
}

async function expectInside(part: Locator, container: { x: number; width: number }) {
  const box = (await part.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(container.x);
  expect(box.x + box.width).toBeLessThanOrEqual(container.x + container.width);
}
