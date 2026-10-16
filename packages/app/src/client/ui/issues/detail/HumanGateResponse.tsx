import { useIssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { WriteErrorAlert } from "../WriteErrorAlert";
import { HumanResponsePanel } from "./HumanResponsePanel";

/**
 * human gate에 응답하거나 응답 없이 닫습니다. 판단 기다림 화면과 막힌 작업 이슈의 상세가 함께 씁니다.
 * gate가 닫히면 막혀 있던 작업 이슈가 풀리지만, 작업 이슈 자체는 닫지 않습니다.
 */
export function HumanGateResponse({ gateId }: { gateId: string }) {
  const writes = useIssueWrites();
  const messages = useMessages();
  return (
    <>
      <WriteErrorAlert writes={writes} />
      <HumanResponsePanel
        issueId={gateId}
        writes={writes}
        title={messages.humanGate.responseTitle}
        body={messages.humanGate.responseBody}
        placeholder={messages.humanGate.responsePlaceholder}
      />
    </>
  );
}
