"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useIssueList } from "@/client/modules/issues/application/useIssueList";
import { useIssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import {
  visibleIssues,
  type IssueListRefinement,
} from "@/client/modules/issues/domain/issueListView";
import type { IssueListFilter } from "@/shared/contract/issueList";
import { IssueDetailRoute, useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { IssueTable } from "@/client/ui/issues/IssueTable";
import { NewIssueDialog } from "@/client/ui/issues/NewIssueDialog";
import { IssueFilterBar } from "./IssueFilterBar";

/** 이슈 상세 dialog가 useSearchParams를 쓰므로 Suspense 안에서 렌더링합니다. */
export function IssuesScreen() {
  const [filter, setFilter] = useState<IssueListFilter>({ kind: "status", statuses: [] });
  const [refinement, setRefinement] = useState<IssueListRefinement>({ types: [], search: "" });
  const [creating, setCreating] = useState(false);
  const { data: issues, error, loading } = useIssueList(filter);
  const shown = issues ? visibleIssues(issues, filter, refinement) : [];
  const writes = useIssueWrites();
  const router = useRouter();
  const issueHref = useIssueHref();

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-4 p-6">
      <header className="flex items-baseline gap-3">
        <h1 className="text-xl font-bold">이슈</h1>
        {issues && <span className="text-sm text-base-content/60">{shown.length}개</span>}
        {loading && (
          <span className="loading loading-spinner loading-xs" aria-label="불러오는 중" />
        )}
        <button
          type="button"
          className="btn btn-primary btn-sm ml-auto self-center"
          onClick={() => setCreating(true)}
        >
          새 이슈
        </button>
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

      {writes.error && (
        <div role="alert" className="alert alert-error alert-soft">
          <span className="whitespace-pre-wrap">{writes.error}</span>
          <button type="button" className="btn btn-ghost btn-xs" onClick={writes.dismissError}>
            닫기
          </button>
        </div>
      )}

      {issues && <IssueTable issues={shown} issueHref={issueHref} writes={writes} />}

      <IssueDetailRoute />
      {creating && (
        <NewIssueDialog
          onCreated={(issueId) => {
            setCreating(false);
            router.push(issueHref(issueId), { scroll: false });
          }}
          onClose={() => setCreating(false)}
        />
      )}
    </main>
  );
}
