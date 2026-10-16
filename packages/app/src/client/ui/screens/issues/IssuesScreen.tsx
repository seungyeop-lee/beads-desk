"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useDescriptionMatches } from "@/client/modules/issues/application/useDescriptionMatches";
import { useIssueList } from "@/client/modules/issues/application/useIssueList";
import { useIssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { useHumanGateTitles } from "@/client/modules/humanGates/application/useHumanGateTitles";
import { filterByDate } from "@/client/modules/issues/domain/issueDateFilter";
import { refineIssues } from "@/client/modules/issues/domain/issueListView";
import { waiterCounts } from "@/shared/domain/issues/waiterCounts";
import { issueListGroups } from "@/client/modules/issues/domain/workState";
import { ALL_STATUSES } from "@/shared/contract/issueList";
import { IssueDetailRoute, useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { IssueTable } from "@/client/ui/issues/IssueTable";
import { IssueFilterBar } from "./IssueFilterBar";
import { IssueGroups } from "./IssueGroups";
import { IssueViewTabs } from "./IssueViewTabs";
import { useIssueListAddress } from "./useIssueListAddress";
import { WriteErrorAlert } from "@/client/ui/issues/WriteErrorAlert";
import { ScreenHeader } from "@/client/ui/designSystem/ScreenHeader";
import { screenTone } from "@/client/ui/shell/screenTabs";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

/**
 * 위쪽 보기 탭으로 작업 상태 하나를 고르고, 유형, 날짜, 검색으로 그 안을 좁힙니다.
 * 보기 탭, 유형, 날짜 조건은 다른 화면에서 링크로 열 수 있도록 주소에 둡니다.
 * 보기 탭과 이슈 상세 dialog가 useSearchParams를 쓰므로 Suspense 안에서 렌더링합니다.
 */
export function IssuesScreen() {
  const [search, setSearch] = useState("");
  const { data: issues, error, loading } = useIssueList(ALL_STATUSES);
  const { address, changeFilters } = useIssueListAddress();
  const { view, dates, types } = address;
  // 이슈가 수천 개면 표를 다시 그리는 데 시간이 걸려, 검색어 입력이 먼저 보이도록 표는 늦춰 갱신합니다.
  const deferredSearch = useDeferredValue(search);
  const description = useDescriptionMatches(search);
  const descriptionMatches = description.matches;
  // 대기 수는 거르기 전의 전체 목록으로 세야, 걸러진 이슈를 거쳐 이어지는 사슬도 셉니다.
  const waiters = useMemo(() => waiterCounts(issues ?? []), [issues]);
  const groups = useMemo(
    () =>
      issueListGroups(
        issues
          ? refineIssues(filterByDate(issues, dates), {
              types,
              search: deferredSearch,
              descriptionMatches,
            })
          : [],
        waiters,
      ),
    [issues, waiters, types, deferredSearch, descriptionMatches, dates],
  );
  const viewIssues = view
    ? (groups.find((group) => group.state === view)?.issues ?? [])
    : groups.flatMap((group) => group.issues);
  const humanGateTitles = useHumanGateTitles();
  const writes = useIssueWrites();
  const issueHref = useIssueHref();
  const messages = useMessages();

  return (
    <main className="mx-auto flex max-w-[96rem] flex-col gap-4 px-8 pb-16">
      <ScreenHeader
        title={messages.issues.title}
        tone={screenTone("/issues")}
        count={issues ? viewIssues.length : undefined}
        loading={loading}
      />

      <IssueViewTabs view={view} filters={{ dates, types }} groups={groups} />

      <IssueFilterBar
        types={types}
        onTypesChange={(next) => changeFilters({ types: next })}
        search={search}
        onSearchChange={setSearch}
        dates={dates}
        onDatesChange={(next) => changeFilters({ dates: next })}
      />

      {error && (
        <div role="alert" className="alert alert-error alert-soft">
          <span>{messages.issues.loadFailed(error)}</span>
        </div>
      )}

      {description.error && (
        <div role="alert" className="alert alert-error alert-soft">
          <span>{messages.issues.descriptionSearchFailed(description.error)}</span>
        </div>
      )}

      <WriteErrorAlert writes={writes} />

      {issues &&
        (view ? (
          <IssueTable
            issues={viewIssues}
            issueHref={issueHref}
            writes={writes}
            titleSource={issues}
            humanGateTitles={humanGateTitles}
            waiters={waiters}
          />
        ) : (
          <IssueGroups
            groups={groups}
            titleSource={issues}
            humanGateTitles={humanGateTitles}
            waiters={waiters}
            issueHref={issueHref}
            writes={writes}
          />
        ))}

      <IssueDetailRoute />
    </main>
  );
}
