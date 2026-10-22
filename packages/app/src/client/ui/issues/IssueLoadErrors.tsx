import { ErrorAlert } from "@/client/ui/designSystem/ErrorAlert";

/** 여러 이슈 조회에서 같은 오류를 받으면 한 번만 보입니다. */
export function IssueLoadErrors({
  errors,
  loadFailed,
}: {
  errors: readonly (string | null)[];
  loadFailed: (error: string) => string;
}) {
  return [...new Set(errors)].map(
    (message) => message && <ErrorAlert key={message}>{loadFailed(message)}</ErrorAlert>,
  );
}
