import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

/** 마지막으로 실패한 쓰기의 오류를 닫을 수 있게 보여 줍니다. */
export function WriteErrorAlert({
  writes,
}: {
  writes: Pick<IssueWrites, "error" | "dismissError">;
}) {
  const messages = useMessages();
  if (!writes.error) return null;
  return (
    <div role="alert" className="alert alert-error alert-soft">
      <span className="whitespace-pre-wrap">{writes.error}</span>
      <button type="button" className="btn btn-ghost btn-xs" onClick={writes.dismissError}>
        {messages.common.close}
      </button>
    </div>
  );
}
