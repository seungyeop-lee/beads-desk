"use client";

import type { Issue } from "@beads-desk/bd/issue";
import Link from "next/link";
import { useState, type DragEvent } from "react";
import {
  boardColumns,
  dropOutcome,
  type ClosedWindow,
} from "@/client/modules/board/domain/boardView";
import { useBoard } from "@/client/modules/board/application/useBoard";
import { issueEdits } from "@/client/modules/issues/application/issueEdits";
import { useIssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { confirmForceClose } from "@/client/ui/issues/fields/confirmForceClose";
import { IssueDetailRoute, useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { priorityLabel, TYPE_LABELS } from "@/client/ui/issues/issueLabels";
import { BOARD_COLUMNS, type BoardColumn } from "@/shared/contract/board";
import { useMinuteClock } from "./useMinuteClock";
import { WriteErrorAlert } from "@/client/ui/issues/WriteErrorAlert";

const COLUMN_LABELS: Record<BoardColumn, string> = {
  blocked: "막힘",
  ready: "바로 작업 가능",
  in_progress: "진행 중",
  closed: "닫힘",
  other: "보류·기타",
};

const CLOSED_WINDOWS: { value: ClosedWindow; label: string }[] = [
  { value: "today", label: "오늘" },
  { value: "3d", label: "최근 3일" },
  { value: "7d", label: "최근 7일" },
];

/** 끌어 온 카드의 id, 원래 열, 상태를 담는 drag data 형식입니다. */
const DRAG_TYPE = "application/x-beads-desk-card";

/**
 * 카드를 다른 열에 놓으면 그 열의 상태로 바꿉니다. 바뀐 결과는 SSE 알림으로 다시 조회해 보여 줍니다.
 * 이슈 상세 dialog가 useSearchParams를 쓰므로 Suspense 안에서 렌더링합니다.
 */
export function BoardScreen() {
  const { data: items, error, loading } = useBoard();
  const writes = useIssueWrites();
  const issueHref = useIssueHref();
  const [closedWindow, setClosedWindow] = useState<ClosedWindow>("today");
  const [dropTarget, setDropTarget] = useState<BoardColumn | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const now = useMinuteClock();
  const columns = items ? boardColumns(items, closedWindow, now) : null;

  const drop = (column: BoardColumn) => (event: DragEvent) => {
    event.preventDefault();
    setDropTarget(null);
    const data = event.dataTransfer.getData(DRAG_TYPE);
    if (!data) return;
    const { issueId, from, status } = JSON.parse(data) as {
      issueId: string;
      from: BoardColumn;
      status: string;
    };
    const outcome = dropOutcome(from, column, status);
    setNotice(
      outcome.kind === "blockedByDependencies"
        ? `${issueId}: 다른 이슈에 막혀 있어 막힘 열에 남습니다. 막고 있는 이슈를 먼저 닫아 주세요.`
        : null,
    );
    if (outcome.kind === "change") {
      void issueEdits(writes, issueId).changeStatus(outcome.status, confirmForceClose);
    }
  };

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-4 p-6">
      <header className="flex items-baseline gap-3">
        <h1 className="text-xl font-bold">보드</h1>
        {(loading || writes.pending) && (
          <span className="loading loading-spinner loading-xs" aria-label="불러오는 중" />
        )}
      </header>

      {error && (
        <div role="alert" className="alert alert-error alert-soft">
          <span>보드를 불러오지 못했습니다: {error}</span>
        </div>
      )}
      <WriteErrorAlert writes={writes} />

      {notice && (
        <output className="alert alert-info alert-soft">
          <span>{notice}</span>
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => setNotice(null)}>
            닫기
          </button>
        </output>
      )}

      {columns && (
        <div className="grid gap-4 md:grid-cols-5">
          {BOARD_COLUMNS.map((column) => (
            // 카드를 놓을 자리라 열 영역이 drag event를 받습니다. 키보드로는 상세 dialog의 상태 선택으로 같은 일을 합니다.
            // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
            <section
              key={column}
              aria-label={COLUMN_LABELS[column]}
              className={`flex min-w-0 flex-col gap-2 rounded-box bg-base-100 p-3 ${dropTarget === column ? "ring-2 ring-primary" : ""}`}
              onDragOver={(event) => {
                if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
                event.preventDefault();
                setDropTarget(column);
              }}
              onDragLeave={() => setDropTarget((target) => (target === column ? null : target))}
              onDrop={drop(column)}
            >
              <h2 className="flex items-center gap-2 font-semibold">
                {COLUMN_LABELS[column]}
                <span className="text-sm font-normal text-base-content/60">
                  {columns[column].length}
                </span>
                {column === "closed" && (
                  <select
                    className="select select-xs ml-auto w-auto"
                    aria-label="닫힌 이슈 기간"
                    value={closedWindow}
                    onChange={(event) => setClosedWindow(event.target.value as ClosedWindow)}
                  >
                    {CLOSED_WINDOWS.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                )}
              </h2>
              <ul className="flex flex-col gap-2">
                {columns[column].map((issue) => (
                  <BoardCard
                    key={issue.id}
                    issue={issue}
                    column={column}
                    href={issueHref(issue.id)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <IssueDetailRoute />
    </main>
  );
}

function BoardCard({ issue, column, href }: { issue: Issue; column: BoardColumn; href: string }) {
  return (
    <li>
      <Link
        href={href}
        scroll={false}
        className="block cursor-grab rounded-box border border-base-300 bg-base-100 p-2 text-sm shadow-xs hover:border-primary active:cursor-grabbing"
        onDragStart={(event) => {
          event.dataTransfer.setData(
            DRAG_TYPE,
            JSON.stringify({ issueId: issue.id, from: column, status: issue.status }),
          );
          event.dataTransfer.effectAllowed = "move";
        }}
      >
        <span className="block break-words">{issue.title || "(제목 없음)"}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1 text-xs text-base-content/60">
          <span className="badge badge-ghost badge-xs">
            {TYPE_LABELS[issue.issueType] ?? issue.issueType}
          </span>
          {issue.priority !== null && (
            <span className="badge badge-ghost badge-xs">
              P{issue.priority} {priorityLabel(issue.priority)}
            </span>
          )}
          <span className="ml-auto font-mono">{issue.id}</span>
        </span>
      </Link>
    </li>
  );
}
