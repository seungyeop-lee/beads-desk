"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useIssueList } from "@/client/modules/issues/application/useIssueList";
import {
  visibleIssues,
  type IssueListRefinement,
} from "@/client/modules/issues/domain/issueListView";
import type { IssueListFilter } from "@/shared/contract/issueList";
import { IssueDetailDialog } from "./detail/IssueDetailDialog";
import { IssueFilterBar } from "./IssueFilterBar";
import { IssueTable } from "./IssueTable";

/** 상세 dialog로 연 이슈 id를 담는 query 이름입니다. 주소를 공유하거나 새로고침해도 같은 이슈가 열립니다. */
const ISSUE_PARAM = "issue";

/** useSearchParams를 쓰므로 Suspense 안에서 렌더링합니다. */
export function IssuesScreen() {
  const [filter, setFilter] = useState<IssueListFilter>({ kind: "status", statuses: [] });
  const [refinement, setRefinement] = useState<IssueListRefinement>({ types: [], search: "" });
  const { data: issues, error, loading } = useIssueList(filter);
  const shown = issues ? visibleIssues(issues, filter, refinement) : [];
  const pathname = usePathname();
  const router = useRouter();
  const selectedIssueId = useSearchParams().get(ISSUE_PARAM);
  const issueHref = (issueId: string) =>
    `${pathname}?${new URLSearchParams({ [ISSUE_PARAM]: issueId })}`;

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-4 p-6">
      <header className="flex items-baseline gap-3">
        <h1 className="text-xl font-bold">이슈</h1>
        {issues && <span className="text-sm text-base-content/60">{shown.length}개</span>}
        {loading && (
          <span className="loading loading-spinner loading-xs" aria-label="불러오는 중" />
        )}
      </header>

      <IssueFilterBar
        filter={filter}
        refinement={refinement}
        onFilterChange={setFilter}
        onRefinementChange={setRefinement}
      />

      {error && (
        <div role="alert" className="alert alert-error alert-soft">
          <span>이슈 목록을 불러오지 못했습니다: {error}</span>
        </div>
      )}

      {issues && <IssueTable issues={shown} issueHref={issueHref} />}

      {selectedIssueId && (
        <IssueDetailDialog
          issueId={selectedIssueId}
          issueHref={issueHref}
          onClose={() => router.replace(pathname, { scroll: false })}
        />
      )}
    </main>
  );
}
