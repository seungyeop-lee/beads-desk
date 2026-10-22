"use client";

import { ScreenFrame } from "@/client/ui/designSystem/ScreenFrame";
import { useIssueListView } from "@/client/modules/issues/application/useIssueListView";
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
import { screenTone } from "@/client/ui/shell/screenTabs";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

/**
 * 위쪽 보기 탭으로 작업 상태 하나를 고르고, 유형, 라벨, 날짜, 검색으로 그 안을 좁힙니다.
 * 보기 탭, 유형, 라벨, 날짜 조건은 다른 화면에서 링크로 열 수 있도록 주소에 둡니다.
 * 보기 탭과 이슈 상세 dialog가 useSearchParams를 쓰므로 Suspense 안에서 렌더링합니다.
 */
export function IssuesScreen() {
  const { address, changeFilters } = useIssueListAddress();
  const { view, dates, types, labels } = address;
  const { search, setSearch, issues, error, loading, textSearch, waiters, groups, viewIssues } =
    useIssueListView(address);
  const textMatches = textSearch.matches;
  const gateTitles = useGateTitles();
  const writes = useIssueWrites();
  const issueHref = useIssueHref();
  const messages = useMessages();

  return (
    <ScreenFrame>
      <ScreenHeader
        title={messages.issues.title}
        tone={screenTone("/issues")}
        count={issues ? viewIssues.length : undefined}
        loading={loading}
      />

      <IssueViewTabs view={view} filters={{ dates, types, labels }} groups={groups} />

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

      {issues &&
        (view ? (
          <IssueTable
            issues={viewIssues}
            issueHref={issueHref}
            writes={writes}
            titleSource={issues}
            gateTitles={gateTitles}
            waiters={waiters}
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
