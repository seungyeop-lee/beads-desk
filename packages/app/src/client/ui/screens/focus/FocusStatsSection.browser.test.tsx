import { expect, test, vi } from "vitest";
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
