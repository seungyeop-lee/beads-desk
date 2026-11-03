import { expect } from "vitest";

/**
 * target에 focus를 옮긴 뒤 계산된 외곽선을 `모양 두께 간격`(예: `solid 2px 2px`)으로 돌려줍니다.
 * 키보드로 옮긴 focus를 재려면 KeyboardFocusMode를 함께 그리고 먼저 Tab을 눌러 둡니다. 브라우저가 그 focus를
 * :focus-visible로 보지 않으면 외곽선을 재기 전에 실패합니다.
 */
export function keyboardOutline(target: Element) {
  (target as HTMLElement).focus();
  expect(target.matches(":focus-visible")).toBe(true);
  const { outlineStyle, outlineWidth, outlineOffset } = getComputedStyle(target);
  return `${outlineStyle} ${outlineWidth} ${outlineOffset}`;
}
