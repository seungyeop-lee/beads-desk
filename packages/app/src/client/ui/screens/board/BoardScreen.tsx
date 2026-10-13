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
import {
  priorityLabel,
  priorityTone,
  READY_TONE,
  statusTone,
} from "@/client/ui/issues/issueLabels";
import { IssueTypeTag } from "@/client/ui/issues/IssueTypeTag";
import { BOARD_COLUMNS, type BoardColumn } from "@/shared/contract/board";
import { useMinuteClock } from "./useMinuteClock";
import { WriteErrorAlert } from "@/client/ui/issues/WriteErrorAlert";
import { ScreenHeader } from "@/client/ui/designSystem/ScreenHeader";
import { screenTone } from "@/client/ui/shell/screenTabs";

const COLUMN_LABELS: Record<BoardColumn, string> = {
  other: "보류·기타",
  blocked: "막힘",
  ready: "바로 작업 가능",
  in_progress: "진행 중",
  closed: "닫힘",
};

const COLUMN_TONES: Record<BoardColumn, string> = {
  other: statusTone("deferred"),
  blocked: statusTone("blocked"),
  ready: READY_TONE,
  in_progress: statusTone("in_progress"),
  closed: statusTone("closed"),
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
    <main className="mx-auto flex max-w-[96rem] flex-col gap-4 px-8 pb-16">
      <ScreenHeader
        title="보드"
        tone={screenTone("/board")}
        loading={loading || writes.pending}
        description="카드를 다른 열에 끌어다 놓으면 그 열의 상태로 바뀝니다."
      />

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
        <div className="grid items-start gap-3 md:grid-cols-5">
          {BOARD_COLUMNS.map((column) => (
            // 카드를 놓을 자리라 열 영역이 drag event를 받습니다. 키보드로는 상세 dialog의 상태 선택으로 같은 일을 합니다.
            // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
            <section
              key={column}
              aria-label={COLUMN_LABELS[column]}
              className={`tone-wash ${COLUMN_TONES[column]} flex min-h-[60vh] min-w-0 flex-col gap-2 rounded-box p-2 transition-shadow ${dropTarget === column ? "ring-2 ring-base-content/30 ring-inset" : ""}`}
              onDragOver={(event) => {
                if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
                event.preventDefault();
                setDropTarget(column);
              }}
              onDragLeave={() => setDropTarget((target) => (target === column ? null : target))}
              onDrop={drop(column)}
            >
              <h2 className="flex h-8 items-center gap-2 px-1.5 text-sm font-bold">
                <span className={`tone-dot ${COLUMN_TONES[column]}`} />
                {COLUMN_LABELS[column]}
                <span className="font-mono text-xs font-normal text-base-content/50">
                  {columns[column].length}
                </span>
                {column === "closed" && (
                  <select
                    className="ghost-select ml-auto h-7 text-xs font-medium"
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
        className="flex cursor-grab flex-col gap-2.5 rounded-lg border border-base-300 bg-base-100 p-3 text-sm transition hover:border-base-content/25 hover:shadow-sm active:cursor-grabbing"
        onDragStart={(event) => {
          event.dataTransfer.setData(
            DRAG_TYPE,
            JSON.stringify({ issueId: issue.id, from: column, status: issue.status }),
          );
          event.dataTransfer.effectAllowed = "move";
        }}
      >
        <span className="leading-snug font-medium break-words">{issue.title || "(제목 없음)"}</span>
        <span className="flex flex-wrap items-center gap-2 text-xs text-base-content/60">
          <IssueTypeTag issueType={issue.issueType} />
          {issue.priority !== null && (
            <span className={`chip h-5 px-2 text-[11px] ${priorityTone(issue.priority)}`}>
              P{issue.priority} {priorityLabel(issue.priority)}
            </span>
          )}
          <span className="ml-auto font-mono text-base-content/45">{issue.id}</span>
        </span>
      </Link>
    </li>
  );
}
