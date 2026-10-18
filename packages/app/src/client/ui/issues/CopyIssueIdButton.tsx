import { documentMessages } from "@/client/infra/locale/documentLocale";
import { shortIssueId } from "@/client/modules/issues/domain/issueId";
import { showToast } from "@/client/ui/designSystem/Toast";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

type Props = {
  issueId: string;
  /** 화면에는 짧은 ID를 보입니다. 복사하는 값은 언제나 전체 ID입니다. */
  short?: boolean;
  /** 자리마다 원래 ID 표시의 글자 크기, 색, 배치를 줍니다. */
  className?: string;
};

/**
 * 이슈 ID를 보이고, 누르면 전체 ID를 클립보드에 복사한 뒤 결과를 Toast로 알립니다.
 * 링크나 버튼 안에는 넣을 수 없습니다. 행 전체가 링크나 선택 버튼인 곳은 그 요소를 absolute로 행 전체에 겹치고,
 * 이 버튼에 relative를 주어 그 위에 올립니다.
 */
export function CopyIssueIdButton({ issueId, short = false, className = "" }: Props) {
  const messages = useMessages();
  return (
    <button
      type="button"
      className={`cursor-copy font-mono hover:text-base-content ${className}`}
      title={messages.copyId.label}
      aria-label={messages.copyId.labelOf(issueId)}
      onClick={() => void copyIssueId(issueId)}
    >
      {short ? shortIssueId(issueId) : issueId}
    </button>
  );
}

async function copyIssueId(issueId: string) {
  const messages = documentMessages();
  try {
    await navigator.clipboard.writeText(issueId);
    showToast(messages.copyId.copied(issueId));
  } catch {
    showToast(messages.copyId.failed(issueId));
  }
}
