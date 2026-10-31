"use client";

import { useMemo } from "react";
import { ScreenFrame } from "@/client/ui/designSystem/ScreenFrame";
import { BOTTLENECK_ORDER } from "@/client/modules/focus/domain/focusBottlenecks";
import { useIssueListView } from "@/client/modules/issues/application/useIssueListView";
import { BOTTLENECK_VIEW } from "@/client/modules/issues/domain/issueView";
import { useIssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { useGateTitles } from "@/client/modules/gates/application/useGateTitles";
import { labelChoices } from "@/client/modules/issues/domain/issueLabelFilter";
import { IssueDetailRoute, useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { IssueTable } from "@/client/ui/issues/IssueTable";
import { IssueFilterBar } from "./IssueFilterBar";
import { IssueGroups } from "./IssueGroups";
import { IssueViewTabs } from "./IssueViewTabs";
import { useIssueListAddress } from "./useIssueListAddress";
import { WriteErrorAlert } from "@/client/ui/issues/WriteErrorAlert";
import { ErrorAlert } from "@/client/ui/designSystem/ErrorAlert";
import { ScreenHeader } from "@/client/ui/designSystem/ScreenHeader";
import { useMinuteClock } from "@/client/ui/designSystem/useMinuteClock";
import { screenTone } from "@/client/ui/shell/screenTabs";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

/**
 * 위쪽 보기 탭으로 작업 상태 하나나 병목 후보를 고르고, 유형, 라벨, 날짜, 검색으로 그 안을 좁힙니다.
 * 병목 탭은 지금 화면의 병목 목록과 같은 순서로 보이고, 표에 닫으면 바로 풀리는 수 열을 더합니다.
 * 보기 탭, 유형, 라벨, 날짜 조건은 다른 화면에서 링크로 열 수 있도록 주소에 둡니다.
 * 보기 탭과 이슈 상세 dialog가 useSearchParams를 쓰므로 Suspense 안에서 렌더링합니다.
 */
export function IssuesScreen() {
  const { address, changeFilters } = useIssueListAddress();
  const { view, dates, types, labels } = address;
  const now = useMinuteClock();
  const {
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
  } = useIssueListView(address, now);
  const bottleneckView = view === BOTTLENECK_VIEW;
  const unblocks = useMemo(
    () =>
      bottleneckView
        ? new Map(bottlenecks.map((bottleneck) => [bottleneck.issue.id, bottleneck.unblocks]))
        : undefined,
    [bottleneckView, bottlenecks],
  );
  const textMatches = textSearch.matches;
  const gateTitles = useGateTitles();
  const writes = useIssueWrites();
  const issueHref = useIssueHref();
  const messages = useMessages();

  return (
    <ScreenFrame>
      <ScreenHeader title={messages.issues.title} tone={screenTone("/issues")} loading={loading} />

      <IssueViewTabs
        view={view}
        filters={{ dates, types, labels }}
        groups={groups}
        bottleneckCount={bottlenecks.length}
      />

      <IssueFilterBar
        types={types}
        onTypesChange={(next) => changeFilters({ types: next })}
        labels={labels}
        labelChoices={labelChoices(issues ?? [], labels)}
        onLabelsChange={(next) => changeFilters({ labels: next })}
        search={search}
        onSearchChange={setSearch}
        dates={dates}
        onDatesChange={(next) => changeFilters({ dates: next })}
      />

      {error && <ErrorAlert>{messages.issues.loadFailed(error)}</ErrorAlert>}

      {textSearch.error && (
        <ErrorAlert>{messages.issues.textSearchFailed(textSearch.error)}</ErrorAlert>
      )}

      <WriteErrorAlert writes={writes} />

      {issues && bottleneckView && (
        <p className="px-1 text-xs text-emphasis-60">
          {messages.focus.bottlenecks.order(BOTTLENECK_ORDER)}
        </p>
      )}

      {issues &&
        (view ? (
          <IssueTable
            issues={viewIssues}
            issueHref={issueHref}
            writes={writes}
            titleSource={issues}
            gateTitles={gateTitles}
            waiters={waiters}
            unblocks={unblocks}
            searchHits={textMatches}
            searchTerm={textSearch.term}
          />
        ) : (
          <IssueGroups
            groups={groups}
            titleSource={issues}
            gateTitles={gateTitles}
            waiters={waiters}
            issueHref={issueHref}
            writes={writes}
            searchHits={textMatches}
            searchTerm={textSearch.term}
          />
        ))}

      <IssueDetailRoute />
    </ScreenFrame>
  );
}
