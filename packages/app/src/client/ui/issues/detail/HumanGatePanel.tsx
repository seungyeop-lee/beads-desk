import {
  humanGateReason,
  isOpenHumanGateLink,
  type IssueDetail,
  type IssueLink,
} from "@beads-desk/bd/issue";
import Link from "next/link";
import { useId } from "react";
import { useIssueDetail } from "@/client/modules/issues/application/useIssueDetail";
import { MarkdownEditor } from "@/client/ui/designSystem/MarkdownEditor";
import { ErrorAlert } from "@/client/ui/designSystem/ErrorAlert";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { HUMAN_DECISION_TONE } from "../issueLabels";
import { HumanGateResponse } from "./HumanGateResponse";
import { CopyIssueIdButton } from "../CopyIssueIdButton";

type Props = {
  issue: IssueDetail;
  issueHref: (issueId: string) => string;
};

/** 열린 human gate가 막고 있는 작업 이슈에서, gate마다 사유를 보이고 응답하거나 응답 없이 닫게 합니다. */
export function HumanGatePanel({ issue, issueHref }: Props) {
  const messages = useMessages();
  const headingId = useId();
  const gates = issue.dependencies.filter(
    (link) => link.dependencyType === "blocks" && isOpenHumanGateLink(link),
  );
  if (gates.length === 0 || issue.status === "closed") return null;
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-box border border-base-300 px-4 py-3"
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
