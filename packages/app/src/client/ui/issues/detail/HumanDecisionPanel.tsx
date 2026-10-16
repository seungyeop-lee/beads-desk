import { awaitsHumanDecision, type IssueDetail } from "@beads-desk/bd/issue";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { HumanResponsePanel } from "./HumanResponsePanel";

type Props = {
  issue: IssueDetail;
  writes: IssueWrites;
};

/** 판단을 기다리는 이슈에서 응답하거나 응답 없이 닫습니다. */
export function HumanDecisionPanel({ issue, writes }: Props) {
  const messages = useMessages();
  if (!awaitsHumanDecision(issue)) return null;
  return (
    <HumanResponsePanel
      issueId={issue.id}
      writes={writes}
      title={messages.humanDecision.panelTitle}
      body={messages.humanDecision.panelBody}
      placeholder={messages.humanDecision.placeholder}
    />
  );
}
