import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { focusStats } from "@/client/modules/focus/domain/focusStats";
import { enMessages } from "@/client/modules/locale/domain/enMessages";
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

test("오른쪽 끝 차트 안내는 짧은 계열명과 값을 한 줄씩 읽을 수 있는 크기로 보인다", async () => {
  await page.viewport(1280, 900);
  const stats = focusStats([], [], Date.now());
  const today = stats.daily.at(-1)!;
  stats.daily[stats.daily.length - 1] = { ...today, created: 5, closed: 3 };
  const screen = await render(
    <LocaleProvider locale="en">
      <FocusStatsSection stats={stats} />
    </LocaleProvider>,
  );
  const closed = screen.getByRole("link", {
    name: enMessages.focus.stats.openDay(
      Number(today.day.slice(5, 7)),
      Number(today.day.slice(8, 10)),
      "closed",
      3,
    ),
  });
  await userEvent.hover(closed);
  const tooltip = page.getByRole("tooltip");
  await expect.element(tooltip).toBeVisible();
  await expect
    .element(tooltip)
    .toHaveTextContent(
      `${enMessages.focus.stats.today}${enMessages.focus.stats.series.created}5${enMessages.focus.stats.series.closed}3`,
    );
  for (const series of ["created", "closed"] as const) {
    const walker = document.createTreeWalker(tooltip.element(), NodeFilter.SHOW_TEXT);
    let label = walker.nextNode();
    while (label && label.textContent !== enMessages.focus.stats.series[series]) {
      label = walker.nextNode();
    }
    expect(label).not.toBeNull();
    const range = document.createRange();
    range.selectNodeContents(label!);
    expect(range.getClientRects()).toHaveLength(1);
    const row = label!.parentElement!;
    expect(row.getBoundingClientRect().height).toBeCloseTo(
      Number.parseFloat(getComputedStyle(row).lineHeight),
      0,
    );
  }
  const surface = tooltip.element();
  expect(surface.scrollWidth).toBeLessThanOrEqual(surface.clientWidth);
});
