import type { Issue } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import { render } from "vitest-browser-react";
import type { WorkStateGroup } from "@/client/modules/issues/domain/workState";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { IssueViewTabs } from "./IssueViewTabs";

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
            filters={{ dates: { field: "created", from: null, to: null }, types: [] }}
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

    // 탭 줄이 넘친 내용을 잘라 내면, 아래 경계 바로 위에서는 탭이 아니라 탭 줄이 잡힙니다.
    const navBox = nav.getBoundingClientRect();
    const tabBox = current.getBoundingClientRect();
    expect(tabBox.bottom).toBeCloseTo(navBox.bottom, 1);
    const hit = document.elementFromPoint(tabBox.x + tabBox.width / 2, navBox.bottom - 0.5);
    expect(hit?.closest("a")).toBe(current);
  });
}

function issue(id: string): Issue {
  return {
    id,
    title: id,
    status: "open",
    priority: 2,
    issueType: "task",
    assignee: null,
    labels: [],
    parent: null,
    dependencyCount: 0,
    dependentCount: 0,
    createdAt: 0,
    updatedAt: 0,
    startedAt: null,
    closedAt: null,
    deferUntil: null,
  };
}
