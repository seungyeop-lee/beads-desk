import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import type { WorkStateGroup } from "@/client/modules/issues/domain/workState";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { IssueViewTabs } from "./IssueViewTabs";

vi.mock("next/navigation", () => ({ useParams: () => ({ workspace: "demo" }) }));

const GROUPS: WorkStateGroup[] = [
  { state: "in_progress", issues: [issue("doing")] },
  { state: "closed", issues: [issue("done")] },
];

for (const { width, horizontal } of [
  { width: 1440, horizontal: false },
  { width: 390, horizontal: true },
]) {
  test(`폭 ${width}px에서 보기 탭 줄은 세로로 스크롤되지 않고, 고른 탭의 밑줄이 탭 줄 아래 경계에 보인다`, async () => {
    const screen = await render(
      <LocaleProvider locale="ko">
        <div style={{ width }}>
          <IssueViewTabs
            view={null}
            filters={{ dates: { field: "created", from: null, to: null }, types: [], labels: [] }}
            groups={GROUPS}
          />
        </div>
      </LocaleProvider>,
    );
    const nav = screen.getByRole("navigation", { name: "보기" }).element();
    const current = screen.getByRole("link", { name: "전체 2" }).element();

    expect({
      vertical: nav.scrollHeight > nav.clientHeight,
      horizontal: nav.scrollWidth > nav.clientWidth,
    }).toEqual({ vertical: false, horizontal });

    // 아래 선은 탭을 감싼 묶음이 그립니다. 탭 줄이 넘친 내용을 잘라 내면, 선의 마지막 픽셀 줄에서는 탭이 아니라 탭 줄이 잡힙니다.
    // 그 줄 안의 소수 좌표(예: 0.5px 위)는 아래의 가로 스크롤바 영역으로 잡힐 수 있어, 줄의 위쪽 경계를 짚습니다.
    const lineBox = current.parentElement!.getBoundingClientRect();
    const tabBox = current.getBoundingClientRect();
    expect(tabBox.bottom).toBeCloseTo(lineBox.bottom, 1);
    const hit = document.elementFromPoint(tabBox.x + tabBox.width / 2, lineBox.bottom - 1);
    expect(hit?.closest("a")).toBe(current);
  });
}
