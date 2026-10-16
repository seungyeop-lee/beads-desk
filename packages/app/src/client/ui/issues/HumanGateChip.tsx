import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { HUMAN_DECISION_TONE } from "./issueLabels";

/** 열린 human gate가 막고 있는 이슈에 붙입니다. 사람이 gate를 승인해야 막힘이 풀립니다. */
export function HumanGateChip() {
  const messages = useMessages();
  return (
    <span className={`chip h-5 shrink-0 px-2 text-[11px] ${HUMAN_DECISION_TONE}`}>
      {messages.humanGate.waiting}
    </span>
  );
}
