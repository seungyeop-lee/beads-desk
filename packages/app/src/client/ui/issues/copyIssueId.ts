import { showToast } from "@/client/ui/designSystem/Toast";

/** 이슈 ID를 클립보드에 복사하고 결과를 Toast로 알립니다. */
export async function copyIssueId(issueId: string) {
  try {
    await navigator.clipboard.writeText(issueId);
    showToast(`ID를 복사했습니다: ${issueId}`);
  } catch {
    showToast(`ID를 복사하지 못했습니다: ${issueId}`);
  }
}
