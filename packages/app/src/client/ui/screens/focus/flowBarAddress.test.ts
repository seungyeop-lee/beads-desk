import type { Issue } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import { focusStats } from "@/client/modules/focus/domain/focusStats";
import { filterByDate } from "@/client/modules/issues/domain/issueDateFilter";
import { refineIssues } from "@/client/modules/issues/domain/issueListView";
import { issue } from "@/shared/domain/issues/issueFixture";
import { waiterCounts } from "@/shared/domain/issues/waiterCounts";
import { issueListGroups } from "@/client/modules/issues/domain/workState";
import { readIssueListAddress } from "@/client/ui/screens/issues/issueListAddress";
import { FLOW_SERIES, flowBarHref } from "./flowBarAddress";

// 현지 시각으로 만들어, 테스트를 실행하는 시간대와 관계없이 하루의 경계를 확인합니다.
const at = (day: number, hour = 12) => new Date(2026, 9, day, hour).getTime();
const NOW = at(15, 15);
const closed = (createdDay: number, closedDay: number) => ({
  status: "closed",
  createdAt: at(createdDay),
  closedAt: at(closedDay),
});

/** 이슈 목록 화면(IssuesScreen)이 주소의 조건으로 이슈를 거르는 순서를 따릅니다. 검색어는 비어 있습니다. */
function issueListCount(issues: Issue[], href: string): number {
  const { view, dates, types } = readIssueListAddress(
    new URL(href, "http://localhost").searchParams,
  );
  const groups = issueListGroups(
    refineIssues(filterByDate(issues, dates), { types, search: "" }),
    waiterCounts(issues),
  );
  return view
    ? (groups.find((group) => group.state === view)?.issues.length ?? 0)
    : groups.reduce((sum, group) => sum + group.issues.length, 0);
}

test("오늘 막대가 여는 이슈 목록은 막대의 숫자와 같은 개수의 이슈를 보인다", () => {
  const issues = [
    issue("task-today", { createdAt: at(15, 0) }),
    issue("bug-closed-today", { issueType: "bug", ...closed(15, 15) }),
    issue("task-closed-today", closed(14, 15)),
    issue("task-yesterday", { createdAt: at(14, 23) }),
    issue("epic-closed-today", { issueType: "epic", ...closed(15, 15) }),
    issue("decision-today", { issueType: "decision", createdAt: at(15) }),
    issue("decision-closed-today", { issueType: "decision", ...closed(15, 15) }),
  ];
  const today = focusStats(issues, [], NOW).daily.at(-1)!;

  expect(today).toMatchObject({ created: 2, closed: 2 });
  for (const series of FLOW_SERIES) {
    expect(issueListCount(issues, flowBarHref(series, today.day))).toBe(today[series]);
  }
});
