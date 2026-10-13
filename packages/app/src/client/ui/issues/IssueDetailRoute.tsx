import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { IssueDetailDialog } from "./detail/IssueDetailDialog";

/** 상세 dialog로 연 이슈 id를 담는 query 이름입니다. 주소를 공유하거나 새로고침해도 같은 이슈가 열립니다. */
const ISSUE_PARAM = "issue";

/** 지금 화면 위에 이슈 상세 dialog를 여는 주소를 만듭니다. */
export function useIssueHref(): (issueId: string) => string {
  const pathname = usePathname();
  return useCallback(
    (issueId: string) => `${pathname}?${new URLSearchParams({ [ISSUE_PARAM]: issueId })}`,
    [pathname],
  );
}

/** 주소에 이슈 id가 있으면 상세 dialog를 엽니다. useSearchParams를 쓰므로 Suspense 안에서 렌더링합니다. */
export function IssueDetailRoute() {
  const pathname = usePathname();
  const router = useRouter();
  const issueHref = useIssueHref();
  const issueId = useSearchParams().get(ISSUE_PARAM);
  if (!issueId) return null;
  return (
    <IssueDetailDialog
      issueId={issueId}
      issueHref={issueHref}
      onClose={() => router.replace(pathname, { scroll: false })}
    />
  );
}
