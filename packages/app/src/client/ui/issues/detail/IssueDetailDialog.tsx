import type { IssueDetail } from "@beads-desk/bd/issue";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type RefObject } from "react";
import { useIssueDetail } from "@/client/modules/issues/application/useIssueDetail";
import { useIssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import type { IssueDetailLocation } from "@/client/modules/issues/domain/issueDetailTrail";
import { ChevronLeftIcon, CloseIcon } from "@/client/ui/designSystem/icons";
import { ErrorAlert } from "@/client/ui/designSystem/ErrorAlert";
import { escapeStepHandlers, ModalBackdrop, useShowModal } from "@/client/ui/designSystem/modal";
import { IssueTypeTag } from "../IssueTypeTag";
import { IssueDetailView } from "./IssueDetailView";
import type { ListedIssues } from "./listedIssues";
import { IssueSidePanel } from "./IssueSidePanel";
import { WriteErrorAlert } from "../WriteErrorAlert";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { CopyIssueIdButton } from "../CopyIssueIdButton";

type Props = {
  embedded?: boolean;
  /** 그래프 dialog가 이 dialog 위에 겹쳐 열려 있으면 true입니다. */
  covered?: boolean;
  /** 화면의 상세 dialog가 열리면 true로, 사라지면 false로 부릅니다. */
  onShownChange?: (shown: boolean) => void;
  listedIssues?: ListedIssues;
  location: IssueDetailLocation;
  /** true면 주 상세를 연 뒤 human gate 응답 칸이 보이도록 스크롤합니다. */
  scrollToHumanGate?: boolean;
  /** 이 dialog에서 지금 주 상세로 넘어오기 전에 보던 상세입니다. 없으면 null입니다. */
  previous: IssueDetailLocation | null;
  detailHref: (location: IssueDetailLocation) => string;
  onClose: () => void;
};

/**
 * 내용을 받은 뒤에 dialog를 열어, 빈 dialog가 내용을 받으면서 커지는 모습이 보이지 않게 합니다.
 * 열기 전까지는 화면 맨 위의 막대와 마우스 커서로 불러오는 중임을 알립니다.
 * 열린 dialog에서 다른 이슈로 옮기면 새 이슈를 받을 때까지 이전 이슈를 그대로 보여 줍니다.
 * 주 상세에서 의존 이슈를 누르면 옆 패널에 그 이슈를 읽기 전용으로 엽니다.
 */
export function IssueDetailDialog({
  location,
  scrollToHumanGate = false,
  previous,
  detailHref,
  onClose,
  embedded = false,
  covered = false,
  onShownChange,
  listedIssues,
}: Props) {
  const { issue: issueId, side } = location;
  const sideHref = (sideId: string) => detailHref({ issue: issueId, side: sideId });
  const closeSideHref = detailHref({ issue: issueId, side: null });
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  // 열 때는 머리글의 ID 복사 단추가 아니라 닫기 단추가 focus를 받아, 바로 Enter를 누르면 dialog가 닫힙니다.
  const closeRef = useRef<HTMLButtonElement>(null);
  const { data, error, loading } = useIssueDetail(issueId);
  const [lastIssue, setLastIssue] = useState<IssueDetail | null>(null);
  if (data && data !== lastIssue) setLastIssue(data);
  const issue = data ?? (loading ? lastIssue : null);
  const opening = loading && lastIssue === null;
  const messages = useMessages();

  useEffect(() => {
    if (!opening) return;
    const root = document.documentElement;
    root.dataset.busy = "";
    return () => {
      delete root.dataset.busy;
    };
  }, [opening]);

  useShowModal(dialogRef, !embedded && !loading, closeRef);
  useEffect(() => {
    if (!loading) onShownChange?.(true);
  }, [loading, onShownChange]);
  useEffect(() => () => onShownChange?.(false), [onShownChange]);

  const close = () => {
    if (embedded) onClose();
    else dialogRef.current?.close();
  };
  const content = (
    <>
      <IssueDetailPanel
        key={`main:${issue?.id ?? issueId}`}
        issueId={issue?.id ?? issueId}
        issue={issue}
        error={issue ? null : error}
        loading={loading}
        listedIssues={listedIssues}
        scrollToHumanGate={scrollToHumanGate}
        previous={previous}
        detailHref={detailHref}
        sideHref={sideHref}
        onDeleted={close}
        onClose={close}
        closeRef={closeRef}
      />
      {side && (
        <IssueSidePanel
          key={`side:${side}`}
          issueId={side}
          closeHref={closeSideHref}
          openHref={detailHref({ issue: side, side: null })}
          sideHref={sideHref}
        />
      )}
    </>
  );

  if (embedded)
    return (
      <section
        aria-label={messages.issueDetail.dialog(issueId)}
        className="flex h-[70dvh] min-h-0 w-full shrink-0 flex-col overflow-y-auto border-t border-base-300 bg-base-100 md:flex-row md:overflow-hidden xl:h-auto xl:w-[min(64rem,70%)] xl:border-t-0 xl:border-l"
      >
        {content}
      </section>
    );

  return (
    <>
      {opening && <output className="loading-bar" aria-label={messages.issueDetail.loading} />}
      <dialog
        ref={dialogRef}
        className="modal"
        aria-label={messages.issueDetail.dialog(issueId)}
        // HTML 표준은 사용자 동작 없이 연 modal dialog를 앞서 연 dialog와 한 묶음으로 보고, Escape 한 번에 묶음을 함께 닫을 수 있게 합니다.
        // 새로고침으로 상세와 그 위의 그래프를 함께 열어도 그래프에서 누른 Escape가 이 dialog까지 닫지 않게 합니다.
        closedby={covered ? "none" : undefined}
        onClose={onClose}
        // 옆 패널이 열려 있으면 옆 패널의 닫기 단추와 같은 주소로 옮겨 옆 패널만 닫습니다.
        {...escapeStepHandlers(() => {
          if (!side) return false;
          router.push(closeSideHref, { scroll: false });
          return true;
        })}
      >
        <div
          className={`modal-box flex h-[85dvh] max-h-[90dvh] w-11/12 flex-col overflow-y-auto p-0 md:h-auto md:flex-row md:overflow-hidden ${side ? "max-w-[110rem]" : "max-w-6xl"}`}
        >
          {content}
        </div>
        <ModalBackdrop />
      </dialog>
    </>
  );
}

type PanelProps = {
  issueId: string;
  issue: IssueDetail | null;
  error: string | null;
  loading: boolean;
  listedIssues: ListedIssues | undefined;
  scrollToHumanGate: boolean;
  previous: IssueDetailLocation | null;
  detailHref: (location: IssueDetailLocation) => string;
  /** 의존 이슈를 옆 패널에 여는 주소입니다. */
  sideHref: (issueId: string) => string;
  onDeleted: () => void;
  onClose: () => void;
  closeRef: RefObject<HTMLButtonElement | null>;
};

function IssueDetailPanel({
  issueId,
  issue,
  error,
  loading,
  listedIssues,
  scrollToHumanGate,
  previous,
  detailHref,
  sideHref,
  onDeleted,
  onClose,
  closeRef,
}: PanelProps) {
  const writes = useIssueWrites();
  const messages = useMessages();
  return (
    <div className="flex min-h-[32rem] min-w-0 shrink-0 grow flex-col md:min-h-0 md:shrink">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-base-300 px-6 py-3">
        {previous && (
          <Link
            className="btn btn-ghost btn-sm -ml-3 gap-1 px-2 font-mono text-xs font-normal text-emphasis-60"
            href={detailHref(previous)}
            scroll={false}
            aria-label={messages.issueDetail.backTo(previous.issue)}
          >
            <ChevronLeftIcon width={14} height={14} />
            {previous.issue}
          </Link>
        )}
        <CopyIssueIdButton
          issueId={issueId}
          className="shrink-0 rounded-md bg-base-200 px-2 py-0.5 text-xs text-emphasis-70"
        />
        {issue && (
          <span className="text-sm text-emphasis-70">
            <IssueTypeTag issueType={issue.issueType} />
          </span>
        )}
        {(loading || writes.pending) && (
          <span
            className="loading loading-spinner loading-xs text-emphasis-40"
            aria-label={messages.issueDetail.working}
          />
        )}
        <div className="ml-auto">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-square text-emphasis-60"
            aria-label={messages.common.close}
          >
            <CloseIcon />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 grow flex-col overflow-y-auto">
        {(writes.error || error) && (
          <div className="flex flex-col gap-2 px-6 pt-4">
            <WriteErrorAlert writes={writes} />
            {error && <ErrorAlert multiline>{messages.issueDetail.loadFailed(error)}</ErrorAlert>}
          </div>
        )}
        {issue && (
          <IssueDetailView
            issue={issue}
            writes={writes}
            listedIssues={listedIssues}
            scrollToHumanGate={scrollToHumanGate}
            issueHref={sideHref}
            onDeleted={onDeleted}
          />
        )}
      </div>
    </div>
  );
}
