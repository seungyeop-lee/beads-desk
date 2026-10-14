import { documentMessages } from "@/client/infra/locale/documentLocale";
import { showToast } from "@/client/ui/designSystem/Toast";

/** 이슈 ID를 클립보드에 복사하고 결과를 Toast로 알립니다. */
export async function copyIssueId(issueId: string) {
  const messages = documentMessages();
  try {
    await navigator.clipboard.writeText(issueId);
    showToast(messages.copyId.copied(issueId));
  } catch {
    showToast(messages.copyId.failed(issueId));
  }
}
