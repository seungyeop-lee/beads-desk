import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { CheckboxMenu } from "./CheckboxMenu";

const LONG_LABEL = "accessibility-and-internationalization";
const OPTIONS = [LONG_LABEL, ...Array.from({ length: 30 }, (_, index) => `label-${index}`)].map(
  (label) => ({ value: label, label, tone: "tone-none" }),
);

test("끊을 곳 없는 긴 이름도 메뉴 너비 안에서 줄을 바꾸고, 선택지가 많으면 메뉴 안에서 세로로 스크롤한다", async () => {
  const screen = await render(
    <CheckboxMenu
      label="라벨"
      summary="전체"
      options={OPTIONS}
      selected={[]}
      onChange={() => {}}
    />,
  );

  await page.elementLocator(screen.container.querySelector("summary")!).click();
  const longOption = screen.getByRole("checkbox", { name: LONG_LABEL });
  await expect.element(longOption).toBeVisible();

  const list = screen.container.querySelector("ul")!;
  expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth);
  expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);
  expect(list.getBoundingClientRect().height).toBeLessThan(window.innerHeight);
});
