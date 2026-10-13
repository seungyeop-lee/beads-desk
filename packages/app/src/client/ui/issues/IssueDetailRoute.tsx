import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { useWorkspaces } from "@/client/modules/workspace/application/useWorkspaces";
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
  const currentWorkspace = useWorkspaces().data?.current ?? null;
  const close = useCallback(() => router.replace(pathname, { scroll: false }), [router, pathname]);

  // 열려 있던 상세는 이전 workspace의 이슈입니다. 이 탭이 아니라 다른 탭이나 CLI에서 바꿔도 닫습니다.
  const seenWorkspace = useRef<string | null>(null);
  useEffect(() => {
    if (currentWorkspace === null) return;
    const switched = seenWorkspace.current !== null && seenWorkspace.current !== currentWorkspace;
    seenWorkspace.current = currentWorkspace;
    if (switched && issueId) close();
  }, [currentWorkspace, issueId, close]);

  if (!issueId) return null;
  // 다른 이슈로 옮기면 새로 그려, 이전 이슈의 쓰기 오류와 진행 표시가 남지 않게 합니다.
  return (
    <IssueDetailDialog key={issueId} issueId={issueId} issueHref={issueHref} onClose={close} />
  );
}
