import { awaitsHumanDecision, type Issue } from "@beads-desk/bd/issue";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { HUMAN_DECISION_TONE } from "./issueLabels";

/** 판단을 기다리는 이슈에만 보입니다. 이 이슈도 bd ready에 나오므로, agent가 가져가기 전에 알아보게 합니다. */
export function HumanDecisionChip({ issue, className = "" }: { issue: Issue; className?: string }) {
  const messages = useMessages();
  if (!awaitsHumanDecision(issue)) return null;
  return (
    <span className={`chip h-5 shrink-0 px-2 text-[11px] ${HUMAN_DECISION_TONE} ${className}`}>
      {messages.humanDecision.chip}
    </span>
  );
}
