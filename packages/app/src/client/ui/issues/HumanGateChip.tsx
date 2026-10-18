import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { HUMAN_DECISION_TONE } from "./issueLabels";
import { IssueChip } from "./IssueChip";

/** 열린 human gate가 막고 있는 이슈에 붙입니다. 사람이 gate를 승인해야 막힘이 풀립니다. */
export function HumanGateChip() {
  const messages = useMessages();
  return (
    <IssueChip tone={HUMAN_DECISION_TONE} className="shrink-0">
      {messages.humanGate.waiting}
    </IssueChip>
  );
}
