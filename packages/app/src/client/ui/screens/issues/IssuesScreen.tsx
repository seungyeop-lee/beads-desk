"use client";

import { useState } from "react";
import { useIssueList } from "@/client/modules/issues/application/useIssueList";
import {
  visibleIssues,
  type IssueListRefinement,
} from "@/client/modules/issues/domain/issueListView";
import type { IssueListFilter } from "@/shared/contract/issueList";
import { IssueFilterBar } from "./IssueFilterBar";
import { IssueTable } from "./IssueTable";

export function IssuesScreen() {
  const [filter, setFilter] = useState<IssueListFilter>({ kind: "status", statuses: [] });
  const [refinement, setRefinement] = useState<IssueListRefinement>({ types: [], search: "" });
  const { data: issues, error, loading } = useIssueList(filter);
  const shown = issues ? visibleIssues(issues, filter, refinement) : [];

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

      {issues && <IssueTable issues={shown} />}
    </main>
  );
}
