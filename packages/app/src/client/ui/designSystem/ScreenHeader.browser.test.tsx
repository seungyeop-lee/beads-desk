import { expect, test } from "vitest";
import { page, userEvent, type Locator } from "vitest/browser";
import { render } from "vitest-browser-react";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { ScreenHeader } from "./ScreenHeader";

const HELP =
  "화면 제목 아래에 설명 줄을 두지 않고 ? 아이콘으로만 보여 주는지 확인하는 설명 문장입니다.";

test("help가 있어도 제목 줄 높이는 help가 없을 때와 같다", async () => {
  await page.viewport(1280, 800);
  const screen = await render(
    <LocaleProvider locale="ko">
      <ScreenHeader title="설명 없는 화면" tone="tone-issues" count={3} />
      <ScreenHeader title="설명 있는 화면" tone="tone-board" count={5} help={HELP} />
    </LocaleProvider>,
  );

  const withoutHelp = screen
    .getByRole("heading", { level: 1, name: "설명 없는 화면" })
    .element()
    .closest("header")!
    .getBoundingClientRect();
  const withHelp = screen
    .getByRole("heading", { level: 1, name: "설명 있는 화면" })
    .element()
    .closest("header")!
    .getBoundingClientRect();
  expect(withHelp.height).toBe(withoutHelp.height);
});

test("? 아이콘의 접근 가능한 이름은 설명이고, 마우스를 올리거나 키보드 초점을 두면 설명이 보인다", async () => {
  await page.viewport(1280, 800);
  const screen = await render(
    <LocaleProvider locale="ko">
      <ScreenHeader title="화면 제목" help={HELP} />
    </LocaleProvider>,
  );
  const button = screen.getByRole("button", { name: HELP });
  const tooltip = screen.getByText(HELP);
  await expect.element(tooltip).not.toBeVisible();

  await userEvent.hover(button);
  await expectVisible(tooltip);

  await userEvent.unhover(button);
  await expect.poll(() => getComputedStyle(tooltip.element()).visibility).toBe("hidden");

  await userEvent.tab();
  await expect.element(button).toHaveFocus();
  await expectVisible(tooltip);
});

/** DecisionsScreen.browser.test.tsx가 참고한 Chrome 110% 폭 500px 창의 CSS viewport입니다. */
const NARROW_WIDTH = 441;

test("제목이 길어 좁은 창에서 줄이 바뀌어도 가로로 넘치지 않고, 설명도 화면 안에 보인다", async () => {
  await page.viewport(NARROW_WIDTH, 900);
  const screen = await render(
    <LocaleProvider locale="ko">
      <ScreenHeader
        title="좁은 창에서 제목이 한 줄에 들어가지 않아 여러 줄로 늘어나도 화면을 가로로 넘기지 않는 화면"
        count={123}
        help={HELP}
      />
    </LocaleProvider>,
  );

  expect(document.documentElement.scrollWidth, `${NARROW_WIDTH}px 페이지 가로 넘침`).toBe(
    document.documentElement.clientWidth,
  );

  await userEvent.hover(screen.getByRole("button", { name: HELP }));
  await expectVisible(screen.getByText(HELP));
  const box = screen.getByText(HELP).element().getBoundingClientRect();
  expect(box.left).toBeGreaterThanOrEqual(0);
  expect(box.right).toBeLessThanOrEqual(NARROW_WIDTH);
});

function expectVisible(tooltip: Locator) {
  return expect.poll(() => getComputedStyle(tooltip.element()).visibility).toBe("visible");
}
