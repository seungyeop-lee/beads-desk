import {
  humanGateReason,
  isOpenHumanGateLink,
  type IssueDetail,
  type IssueLink,
} from "@beads-desk/bd/issue";
import Link from "next/link";
import { useEffect, useId, useRef, type RefObject } from "react";
import { useIssueDetail } from "@/client/modules/issues/application/useIssueDetail";
import { MarkdownEditor } from "@/client/ui/designSystem/MarkdownEditor";
import { ErrorAlert } from "@/client/ui/designSystem/ErrorAlert";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { HUMAN_DECISION_TONE } from "../issueLabels";
import { HumanGateResponse } from "./HumanGateResponse";
import { CopyIssueIdButton } from "../CopyIssueIdButton";
import type { ListedIssues } from "./listedIssues";

type Props = {
  issue: IssueDetail;
  listedIssues?: ListedIssues;
  issueHref: (issueId: string) => string;
  /** true면 상세가 열린 뒤 이 영역이 보이도록 스크롤합니다. */
  scrollIntoView?: boolean;
};

/** 열린 human gate가 막고 있는 작업 이슈에서, gate마다 사유를 보이고 응답하거나 응답 없이 닫게 합니다. */
export function HumanGatePanel({ issue, listedIssues, issueHref, scrollIntoView = false }: Props) {
  const messages = useMessages();
  const headingId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  useKeepScrolledIntoView(sectionRef, scrollIntoView);
  const gates = issue.dependencies.filter(
    (link) =>
      link.dependencyType === "blocks" &&
      isOpenHumanGateLink({ ...link, status: listedIssues?.get(link.id)?.status ?? link.status }),
  );
  if (gates.length === 0 || issue.status === "closed") return null;
  return (
    <section
      ref={sectionRef}
      aria-labelledby={headingId}
      className="flex scroll-mt-6 flex-col gap-4 rounded-box border border-base-300 px-4 py-3"
    >
      <div className="flex flex-col gap-1">
        <h3 id={headingId} className="flex items-center gap-2 text-sm font-semibold">
          <span className={`tone-dot ${HUMAN_DECISION_TONE}`} />
          {messages.humanGate.panelTitle}
        </h3>
        <p className="text-xs text-base-content/65">{messages.humanGate.panelBody}</p>
      </div>
      {gates.map((link) => (
        <HumanGateItem key={link.id} link={link} issueHref={issueHref} />
      ))}
    </section>
  );
}

/** 사용자가 스크롤하거나 누르거나 키를 누르면, 그 뒤로는 영역을 다시 맞추지 않습니다. */
const USER_SCROLL_EVENTS = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

/**
 * 영역이 스크롤 영역의 맨 위에 보이게 맞춥니다. 위에 놓인 본문은 markdown 편집기가 mount된 뒤에 내용을 불러와 늦게 길어지므로,
 * 한 번만 맞추면 영역이 다시 아래로 밀려납니다. 그래서 사용자가 화면을 움직이기 전까지는 영역을 담은 열의 크기가 바뀔 때마다 다시 맞춥니다.
 * 상세 dialog가 열리기 전에는 열의 크기가 0이라 ResizeObserver가 알리지 않으므로, 처음 맞추는 때도 dialog가 열린 뒤입니다.
 */
function useKeepScrolledIntoView(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const element = ref.current;
    const column = element?.parentElement;
    if (!enabled || !element || !column) return;
    const observer = new ResizeObserver(() => element.scrollIntoView({ block: "start" }));
    const stop = () => observer.disconnect();
    observer.observe(column);
    for (const type of USER_SCROLL_EVENTS) window.addEventListener(type, stop, { capture: true });
    return () => {
      stop();
      for (const type of USER_SCROLL_EVENTS)
        window.removeEventListener(type, stop, { capture: true });
    };
  }, [ref, enabled]);
}

function HumanGateItem({
  link,
  issueHref,
}: {
  link: IssueLink;
  issueHref: (issueId: string) => string;
}) {
  const { data: gate, error } = useIssueDetail(link.id);
  const messages = useMessages();
  const reason = gate ? humanGateReason(gate.description) : "";
  return (
    <section aria-label={link.title} className="flex flex-col gap-4 border-t border-base-300 pt-4">
      <div className="flex items-baseline gap-2">
        <CopyIssueIdButton
          issueId={link.id}
          className="shrink-0 rounded text-xs text-base-content/55"
        />
        <Link href={issueHref(link.id)} scroll={false} className="font-semibold hover:underline">
          {link.title || messages.common.untitled}
        </Link>
      </div>
      {error && <ErrorAlert>{messages.issueDetail.loadFailed(error)}</ErrorAlert>}
      {reason && (
        <section className="flex flex-col gap-1 text-sm" aria-label={messages.humanGate.reason}>
          <h4 className="font-semibold">{messages.humanGate.reason}</h4>
          <MarkdownEditor readOnly value={reason} />
        </section>
      )}
      <HumanGateResponse gateId={link.id} />
    </section>
  );
}
