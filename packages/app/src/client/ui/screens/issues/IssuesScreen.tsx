"use client";

import { useSearchParams } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";
import { useIssueList } from "@/client/modules/issues/application/useIssueList";
import { useIssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import {
  nestUnderParents,
  refineIssues,
  type IssueListRefinement,
} from "@/client/modules/issues/domain/issueListView";
import { groupByWorkState, parseViewState } from "@/client/modules/issues/domain/workState";
import type { IssueListFilter } from "@/shared/contract/issueList";
import { IssueDetailRoute, useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { ISSUE_TYPES } from "@/client/ui/issues/issueLabels";
import { IssueTable } from "@/client/ui/issues/IssueTable";
import { IssueFilterBar } from "./IssueFilterBar";
import { IssueGroups } from "./IssueGroups";
import { IssueViewTabs, VIEW_PARAM } from "./IssueViewTabs";
import { WriteErrorAlert } from "@/client/ui/issues/WriteErrorAlert";
import { ScreenHeader } from "@/client/ui/designSystem/ScreenHeader";
import { screenTone } from "@/client/ui/shell/screenTabs";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

/** 결정은 결정 탭에서 보므로, 처음에는 유형 메뉴에서 결정만 뺀 유형을 고른 상태로 엽니다. */
const INITIAL_TYPES = ISSUE_TYPES.filter((type) => type !== "decision");

/** 보기 탭은 화면에서 작업 상태로 나누므로 모든 상태의 이슈를 한 번에 읽습니다. */
const ALL_STATUSES: IssueListFilter = { kind: "status", statuses: [] };

/**
 * 위쪽 보기 탭으로 작업 상태 하나를 고르고, 유형과 검색으로 그 안을 좁힙니다.
 * 보기 탭과 이슈 상세 dialog가 useSearchParams를 쓰므로 Suspense 안에서 렌더링합니다.
 */
export function IssuesScreen() {
  const [refinement, setRefinement] = useState<IssueListRefinement>({
    types: INITIAL_TYPES,
    search: "",
  });
  const { data: issues, error, loading } = useIssueList(ALL_STATUSES);
  // 이슈가 수천 개면 표를 다시 그리는 데 시간이 걸려, 검색어 입력이 먼저 보이도록 표는 늦춰 갱신합니다.
  const deferredRefinement = useDeferredValue(refinement);
  // 묶음 안에서는 하위 이슈를 상위 이슈 바로 아래에 보입니다.
  const groups = useMemo(
    () =>
      groupByWorkState(issues ? refineIssues(issues, deferredRefinement) : []).map((group) => ({
        ...group,
        issues: nestUnderParents(group.issues),
      })),
    [issues, deferredRefinement],
  );
  const view = parseViewState(useSearchParams().get(VIEW_PARAM));
  const viewIssues = view
    ? (groups.find((group) => group.state === view)?.issues ?? [])
    : groups.flatMap((group) => group.issues);
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

      <IssueViewTabs view={view} groups={groups} />

      <IssueFilterBar refinement={refinement} onRefinementChange={setRefinement} />

      {error && (
        <div role="alert" className="alert alert-error alert-soft">
          <span>{messages.issues.loadFailed(error)}</span>
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
          />
        ) : (
          <IssueGroups groups={groups} titleSource={issues} issueHref={issueHref} writes={writes} />
        ))}

      <IssueDetailRoute />
    </main>
  );
}
