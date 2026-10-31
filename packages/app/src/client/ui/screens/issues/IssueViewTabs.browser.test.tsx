import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import type { WorkStateGroup } from "@/client/modules/issues/domain/workState";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { IssueViewTabs } from "./IssueViewTabs";

vi.mock("next/navigation", async () =>
  (await import("@/client/ui/address/screenAddressMocks.testkit")).nextNavigationMock(),
);

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
            bottleneckCount={0}
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

/** 글자 하나의 기준선 높이를 잽니다. 빈 inline-block의 아래 경계는 그 줄의 기준선에 놓입니다. */
function baselineOf(text: Element) {
  const probe = document.createElement("span");
  probe.style.display = "inline-block";
  text.append(probe);
  const baseline = probe.getBoundingClientRect().bottom;
  probe.remove();
  return baseline;
}

test("병목은 작업 상태가 아니라서 상태 탭 뒤에 구분선을 두고 맨 끝에 오고, 탭 이름과 개수는 기준선이 맞는다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <div style={{ width: 1440 }}>
        <IssueViewTabs
          view={null}
          filters={{ dates: { field: "created", from: null, to: null }, types: [], labels: [] }}
          groups={GROUPS}
          bottleneckCount={3}
        />
      </div>
    </LocaleProvider>,
  );
  const nav = screen.getByRole("navigation", { name: "보기" });
  const links = nav.getByRole("link").elements();
  expect(links.map((link) => link.textContent)).toEqual([
    "전체2",
    "진행 중1",
    "바로 작업 가능0",
    "막힘0",
    "보류0",
    "닫힘1",
    "병목3",
  ]);

  // 색 점은 bd가 정한 상태에만 붙이므로, 이 앱이 정한 병목 탭에는 없습니다.
  expect(links.at(-1)!.querySelector(".tone-dot")).toBeNull();

  // 구분선은 장식이라 이름이 없으므로, 병목 탭 바로 앞의 요소로 찾아 닫힘 탭과 병목 탭 사이에 놓였는지 잽니다.
  const closed = links.at(-2)!.getBoundingClientRect();
  const bottleneck = links.at(-1)!;
  const divider = bottleneck.previousElementSibling!.getBoundingClientRect();
  expect(divider.width).toBeGreaterThan(0);
  expect(divider.left).toBeGreaterThanOrEqual(closed.right);
  expect(divider.right).toBeLessThanOrEqual(bottleneck.getBoundingClientRect().left);

  for (const link of links) {
    const [label, count] = link.querySelectorAll(":scope > span:not(.tone-dot)");
    expect(baselineOf(count!)).toBeCloseTo(baselineOf(label!), 0);
  }
  // 구분선은 탭 이름 글자와 세로 가운데가 맞아, 탭 줄 아래 선에 닿지 않습니다.
  const label = bottleneck.querySelector(":scope > span:not(.tone-dot)")!.getBoundingClientRect();
  expect(divider.top + divider.height / 2).toBeCloseTo(label.top + label.height / 2, 0);
});
