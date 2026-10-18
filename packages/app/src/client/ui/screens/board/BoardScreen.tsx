"use client";

import type { Issue } from "@beads-desk/bd/issue";
import Link from "next/link";
import { useState, type DragEvent } from "react";
import {
  acceptsDrop,
  boardColumns,
  dropOutcome,
  type ClosedWindow,
} from "@/client/modules/board/domain/boardView";
import { useBoard } from "@/client/modules/board/application/useBoard";
import { useHumanGateTitles } from "@/client/modules/humanGates/application/useHumanGateTitles";
import { blockersOf } from "@/client/modules/humanGates/domain/humanGateBlockers";
import { issueEdits } from "@/client/modules/issues/application/issueEdits";
import { useIssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { shortIssueId } from "@/client/modules/issues/domain/issueId";
import { statusPrompts } from "@/client/ui/issues/fields/statusPrompts";
import { IssueDetailRoute, useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { READY_TONE, statusTone } from "@/client/ui/issues/issueLabels";
import { BoardBlockerLine } from "@/client/ui/issues/BlockerLine";
import { HumanDecisionChip } from "@/client/ui/issues/HumanDecisionChip";
import { PriorityChip } from "@/client/ui/issues/IssueChip";
import { IssueTypeTag } from "@/client/ui/issues/IssueTypeTag";
import { BOARD_COLUMNS, type BoardColumn } from "@/shared/contract/board";
import { useMinuteClock } from "./useMinuteClock";
import { WriteErrorAlert } from "@/client/ui/issues/WriteErrorAlert";
import { ErrorAlert } from "@/client/ui/designSystem/ErrorAlert";
import { ScreenHeader } from "@/client/ui/designSystem/ScreenHeader";
import { showToast } from "@/client/ui/designSystem/Toast";
import { screenTone } from "@/client/ui/shell/screenTabs";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

const COLUMN_TONES: Record<BoardColumn, string> = {
  blocked: statusTone("blocked"),
  ready: READY_TONE,
  in_progress: statusTone("in_progress"),
  closed: statusTone("closed"),
};

const CLOSED_WINDOWS: ClosedWindow[] = ["today", "3d", "7d", "30d"];

/** 끌어 온 카드의 id, 원래 열, 상태를 담는 drag data 형식입니다. */
const DRAG_TYPE = "application/x-beads-desk-card";

/**
 * 카드를 다른 열에 놓으면 그 열의 상태로 바꿉니다. 바뀐 결과는 SSE 알림으로 다시 조회해 보여 줍니다.
 * 이슈 상세 dialog가 useSearchParams를 쓰므로 Suspense 안에서 렌더링합니다.
 */
export function BoardScreen() {
  const { data: items, error, loading } = useBoard();
  const humanGateTitles = useHumanGateTitles();
  const writes = useIssueWrites();
  const issueHref = useIssueHref();
  const [closedWindow, setClosedWindow] = useState<ClosedWindow>("today");
  const [dropTarget, setDropTarget] = useState<BoardColumn | null>(null);
  const now = useMinuteClock();
  const messages = useMessages();
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
    if (outcome.kind === "blockedByDependencies") {
      showToast(messages.board.stillBlocked(issueId), { tone: statusTone("blocked") });
    }
    if (outcome.kind === "change") {
      void issueEdits(writes, issueId).changeStatus(outcome.status, statusPrompts);
    }
  };

  // 열이 나란히 놓이는 너비(md 이상)에서는 main이 body(flex h-dvh)의 남은 높이를 채우고, 카드가 넘치면 카드 목록만 열 안에서 스크롤됩니다. 좁은 너비에서는 각 열이 카드 내용만큼 늘어나 페이지를 스크롤해 봅니다.
  return (
    <main className="mx-auto flex max-w-[96rem] flex-col gap-4 px-8 pb-16 md:min-h-0 md:flex-1 md:pb-6">
      <ScreenHeader
        title={messages.board.title}
        tone={screenTone("/board")}
        loading={loading || writes.pending}
        help={messages.board.description}
      />

      {error && <ErrorAlert>{messages.board.loadFailed(error)}</ErrorAlert>}
      <WriteErrorAlert writes={writes} />

      {columns && (
        <div className="grid items-start gap-3 md:grid-cols-2 md:min-h-0 md:flex-1 md:auto-rows-fr md:items-stretch xl:grid-cols-4">
          {BOARD_COLUMNS.map((column) => (
            // 카드를 놓을 자리라 열 영역이 drag event를 받습니다. 키보드로는 상세 dialog의 상태 선택으로 같은 일을 합니다.
            // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
            <section
              key={column}
              aria-label={messages.board.columns[column]}
              className={`tone-wash ${COLUMN_TONES[column]} flex min-w-0 flex-col gap-2 rounded-box p-2 transition-shadow md:min-h-0 ${dropTarget === column ? "ring-2 ring-base-content/30 ring-inset" : ""}`}
              onDragOver={(event) => {
                if (!acceptsDrop(column) || !event.dataTransfer.types.includes(DRAG_TYPE)) return;
                event.preventDefault();
                setDropTarget(column);
              }}
              onDragLeave={() => setDropTarget((target) => (target === column ? null : target))}
              onDrop={drop(column)}
            >
              <h2 className="flex min-h-8 flex-wrap items-center gap-x-2 gap-y-1 px-1.5 text-sm font-bold">
                <span className={`tone-dot ${COLUMN_TONES[column]}`} />
                <span className="flex items-baseline gap-2 whitespace-nowrap">
                  {messages.board.columns[column]}
                  <span className="font-mono text-xs font-normal text-base-content/50">
                    {columns[column].length}
                  </span>
                </span>
                {column === "closed" && (
                  <select
                    className="ghost-select ml-auto h-7 text-xs font-medium"
                    aria-label={messages.board.closedWindow}
                    value={closedWindow}
                    onChange={(event) => setClosedWindow(event.target.value as ClosedWindow)}
                  >
                    {CLOSED_WINDOWS.map((period) => (
                      <option key={period} value={period}>
                        {messages.board.closedWindows[period]}
                      </option>
                    ))}
                  </select>
                )}
              </h2>
              {/* 좁은 너비에서 빈 열에도 제목 한 줄짜리 카드 한 장 높이를 남겨, 끌어 온 카드를 놓을 자리를 보입니다. */}
              <ul className="flex min-h-19 flex-col gap-2 md:min-h-0 md:flex-1 md:overflow-y-auto">
                {columns[column].map((issue) => (
                  <BoardCard
                    key={issue.id}
                    issue={issue}
                    column={column}
                    href={issueHref(issue.id)}
                    humanGateTitles={humanGateTitles}
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

type CardProps = {
  issue: Issue;
  column: BoardColumn;
  href: string;
  humanGateTitles: ReadonlyMap<string, string>;
};

function BoardCard({ issue, column, href, humanGateTitles }: CardProps) {
  const messages = useMessages();
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
        <span className="leading-snug font-medium break-words">
          {issue.title || messages.common.untitled}
        </span>
        {/* 보드는 막는 이슈를 id로만 보이고, 열린 human gate만 사람 확인 기다림 표시와 gate 제목으로 보입니다. */}
        <BoardBlockerLine
          blockers={blockersOf(issue.blockedBy ?? [], humanGateTitles, () => undefined)}
        />
        <span className="flex flex-wrap items-center gap-2 text-xs text-base-content/60">
          <IssueTypeTag issueType={issue.issueType} />
          <HumanDecisionChip issue={issue} />
          {issue.priority !== null && <PriorityChip priority={issue.priority} />}
          <span className="ml-auto font-mono text-base-content/45" title={issue.id}>
            {shortIssueId(issue.id)}
          </span>
        </span>
      </Link>
    </li>
  );
}
