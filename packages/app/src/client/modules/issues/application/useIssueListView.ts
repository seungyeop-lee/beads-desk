import type { Issue } from "@beads-desk/bd/issue";
import { useDeferredValue, useMemo, useState } from "react";
import { filterByDate, type IssueDateFilter } from "@/client/modules/issues/domain/issueDateFilter";
import { useFocusDeadlines } from "@/client/modules/focus/application/useFocusDeadlines";
import { focusBottlenecks, type Bottleneck } from "@/client/modules/focus/domain/focusBottlenecks";
import { refineIssues } from "@/client/modules/issues/domain/issueListView";
import { BOTTLENECK_VIEW, type IssueView } from "@/client/modules/issues/domain/issueView";
import { issueListGroups, type WorkStateGroup } from "@/client/modules/issues/domain/workState";
import { waiterCounts } from "@/shared/domain/issues/waiterCounts";
import { useIssueList } from "./useIssueList";
import { useIssueTextMatches, type IssueTextMatches } from "./useIssueTextMatches";

/** 이슈 목록 주소가 고른 조건으로, useIssueListAddress가 읽은 값입니다. */
export type IssueListFilters = {
  /** null이면 전체 보기입니다. */
  view: IssueView | null;
  dates: IssueDateFilter;
  types: readonly string[];
  labels: readonly string[];
};

/**
 * 이슈 목록 화면이 보일 목록을 조립합니다. 날짜 조건으로 고른 목록을 유형, 라벨, 검색어로 좁히고 작업 상태로 묶으며, 병목 후보도 같은 조건으로 좁힙니다.
 * 검색어 입력은 화면이 갖고, 본문·댓글 검색 결과가 오면 목록을 다시 조립합니다.
 * now는 병목 후보가 쓰는 보류 기한 판정의 기준이 되는 현재 시각(epoch ms)입니다.
 */
export function useIssueListView(
  filters: IssueListFilters,
  now: number,
): {
  search: string;
  setSearch: (search: string) => void;
  /** 거르기 전의 전체 목록입니다. 화면이 제목과 라벨 선택지의 출처로 씁니다. */
  issues: Issue[] | null;
  error: string | null;
  loading: boolean;
  /** 본문·댓글 검색 결과와 그 검색어, 오류입니다. */
  textSearch: IssueTextMatches;
  /** 이슈 id마다 대기 수입니다. */
  waiters: ReadonlyMap<string, number>;
  /** 작업 상태로 묶은 목록입니다. */
  groups: WorkStateGroup[];
  /** 조건으로 좁힌 병목 후보입니다. 순서와 수는 지금 화면의 병목 목록과 같습니다. */
  bottlenecks: Bottleneck[];
  /** 고른 보기 탭의 목록입니다. 전체 보기이면 모든 묶음의 이슈를 합칩니다. */
  viewIssues: Issue[];
} {
  const [search, setSearch] = useState("");
  const { data: issues, error, loading } = useIssueList();
  // 이슈가 수천 개면 표를 다시 그리는 데 시간이 걸려, 검색어 입력이 먼저 보이도록 표는 늦춰 갱신합니다.
  const deferredSearch = useDeferredValue(search);
  const textSearch = useIssueTextMatches(search);
  const textMatches = textSearch.matches;
  // 대기 수는 거르기 전의 전체 목록으로 세야, 걸러진 이슈를 거쳐 이어지는 사슬도 셉니다.
  const waiters = useMemo(() => waiterCounts(issues ?? []), [issues]);
  const { dates, types, labels } = filters;
  const refined = useMemo(
    () =>
      issues
        ? refineIssues(filterByDate(issues, dates), {
            types,
            labels,
            search: deferredSearch,
            textMatches,
          })
        : [],
    [issues, types, labels, deferredSearch, textMatches, dates],
  );
  const groups = useMemo(() => issueListGroups(refined, waiters), [refined, waiters]);
  // 병목 후보와 대기 수는 지금 화면과 같도록 거르기 전의 전체 목록으로 계산하고, 그 뒤에 조건에 맞는 후보만 남깁니다.
  const deadlines = useFocusDeadlines(issues);
  const allBottlenecks = useMemo(
    () => (issues && deadlines ? focusBottlenecks(issues, deadlines, now) : []),
    [issues, deadlines, now],
  );
  const bottlenecks = useMemo(() => {
    const shown = new Set(refined.map((issue) => issue.id));
    return allBottlenecks.filter((bottleneck) => shown.has(bottleneck.issue.id));
  }, [allBottlenecks, refined]);
  const viewIssues =
    filters.view === BOTTLENECK_VIEW
      ? bottlenecks.map((bottleneck) => bottleneck.issue)
      : filters.view
        ? (groups.find((group) => group.state === filters.view)?.issues ?? [])
        : groups.flatMap((group) => group.issues);
  return {
    search,
    setSearch,
    issues,
    error,
    loading,
    textSearch,
    waiters,
    groups,
    bottlenecks,
    viewIssues,
  };
}
