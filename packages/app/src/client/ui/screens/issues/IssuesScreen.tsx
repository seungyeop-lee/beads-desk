"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useIssueList } from "@/client/modules/issues/application/useIssueList";
import { useIssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import {
  visibleIssues,
  type IssueListRefinement,
} from "@/client/modules/issues/domain/issueListView";
import type { IssueListFilter } from "@/shared/contract/issueList";
import { IssueDetailRoute, useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { ISSUE_TYPES } from "@/client/ui/issues/issueLabels";
import { IssueTable } from "@/client/ui/issues/IssueTable";
import { IssueFilterBar } from "./IssueFilterBar";
import { WriteErrorAlert } from "@/client/ui/issues/WriteErrorAlert";
import { ScreenHeader } from "@/client/ui/designSystem/ScreenHeader";
import { screenTone } from "@/client/ui/shell/screenTabs";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

/** 결정은 결정 탭에서 보므로, 처음에는 유형 메뉴에서 결정만 뺀 유형을 고른 상태로 엽니다. */
const INITIAL_TYPES = ISSUE_TYPES.filter((type) => type !== "decision");

/** 이슈 상세 dialog가 useSearchParams를 쓰므로 Suspense 안에서 렌더링합니다. */
export function IssuesScreen() {
  const [filter, setFilter] = useState<IssueListFilter>({ kind: "status", statuses: [] });
  const [refinement, setRefinement] = useState<IssueListRefinement>({
    types: INITIAL_TYPES,
    search: "",
  });
  const { data: issues, error, loading } = useIssueList(filter);
  // 이슈가 수천 개면 표를 다시 그리는 데 시간이 걸려, 검색어 입력이 먼저 보이도록 표는 늦춰 갱신합니다.
  const deferredRefinement = useDeferredValue(refinement);
  const shown = useMemo(
    () => (issues ? visibleIssues(issues, filter, deferredRefinement) : []),
    [issues, filter, deferredRefinement],
  );
  const writes = useIssueWrites();
  const issueHref = useIssueHref();
  const messages = useMessages();

  return (
    <main className="mx-auto flex max-w-[96rem] flex-col gap-4 px-8 pb-16">
      <ScreenHeader
        title={messages.issues.title}
        tone={screenTone("/issues")}
        count={issues ? shown.length : undefined}
        loading={loading}
      />

      <IssueFilterBar
        filter={filter}
        refinement={refinement}
        onFilterChange={setFilter}
        onRefinementChange={setRefinement}
      />

      {error && (
        <div role="alert" className="alert alert-error alert-soft">
          <span>{messages.issues.loadFailed(error)}</span>
        </div>
      )}

      <WriteErrorAlert writes={writes} />

      {issues && <IssueTable issues={shown} issueHref={issueHref} writes={writes} />}

      <IssueDetailRoute />
    </main>
  );
}
