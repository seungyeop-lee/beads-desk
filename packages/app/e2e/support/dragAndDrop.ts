import type { Locator } from "@playwright/test";

/**
 * 카드를 집어 든 뒤 페이지를 스크롤해 놓을 자리로 옮깁니다.
 * 페이지가 스크롤되는 화면에서 `dragTo`를 쓰면, 끌기가 시작되기 전에 놓을 자리가 보이도록 스크롤해서 그 위치로 온 다른 카드를 끌게 됩니다.
 */
export async function dragAcrossScroll(card: Locator, target: Locator) {
  const page = card.page();
  await card.hover();
  await page.mouse.down();
  const box = (await card.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2 + 10);
  await target.hover();
  await page.mouse.up();
}
