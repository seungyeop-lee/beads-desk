import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { focusStats } from "@/client/modules/focus/domain/focusStats";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { FocusStatsSection } from "./FocusStatsSection";

vi.mock("next/navigation", async () =>
  (await import("@/client/ui/address/screenAddressMocks.testkit")).nextNavigationMock(),
);

test("최근 7일 동안 닫은 이슈가 없으면 착수 후 처리 시간과 등록 후 처리 시간 두 곳에 빈 상태 문구를 보인다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <FocusStatsSection stats={focusStats([], [], Date.now())} />
    </LocaleProvider>,
  );
  const stats = screen.getByRole("region", { name: messages.focus.stats.title, exact: true });

  await expect.element(stats.getByText(messages.focus.stats.noDuration)).toHaveLength(2);
});

test("차트 안내는 날짜와 만든·닫은 계열별 값을 구분하고 막대의 목록 링크를 유지한다", async () => {
  const stats = focusStats([], [], Date.now());
  stats.daily[stats.daily.length - 1] = { ...stats.daily.at(-1)!, created: 3, closed: 2 };
  const screen = await render(
    <LocaleProvider locale="ko">
      <FocusStatsSection stats={stats} />
    </LocaleProvider>,
  );
  const created = screen.getByRole("link", { name: /만든 이슈 3개 보기/ });
  const closed = screen.getByRole("link", { name: /닫은 이슈 2개 보기/ });
  await expect.element(created).toHaveAttribute("href", expect.stringContaining("/issues?"));
  await expect.element(closed).toHaveAttribute("href", expect.stringContaining("date=closed"));
  await userEvent.hover(created);
  const tooltip = page.getByRole("tooltip");
  await expect.element(tooltip).toBeVisible();
  await expect
    .element(tooltip)
    .toHaveTextContent(
      `${messages.focus.stats.today}${messages.focus.stats.series.created}3${messages.focus.stats.series.closed}2`,
    );
});
