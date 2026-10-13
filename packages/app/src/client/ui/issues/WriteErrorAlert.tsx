import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";

/** 마지막으로 실패한 쓰기의 오류를 닫을 수 있게 보여 줍니다. */
export function WriteErrorAlert({
  writes,
}: {
  writes: Pick<IssueWrites, "error" | "dismissError">;
}) {
  if (!writes.error) return null;
  return (
    <div role="alert" className="alert alert-error alert-soft">
      <span className="whitespace-pre-wrap">{writes.error}</span>
      <button type="button" className="btn btn-ghost btn-xs" onClick={writes.dismissError}>
        닫기
      </button>
    </div>
  );
}
