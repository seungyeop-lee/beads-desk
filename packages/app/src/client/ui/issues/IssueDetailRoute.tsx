import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  nextIssueDetailTrail,
  type IssueDetailLocation,
} from "@/client/modules/issues/domain/issueDetailTrail";
import { useWorkspaces } from "@/client/modules/workspace/application/useWorkspaces";
import { useQueryReplace } from "@/client/ui/address/useQueryReplace";
import { readGraphScope } from "@/client/ui/screens/graph/graphAddress";
import { IssueDetailDialog } from "./detail/IssueDetailDialog";

/** 상세 dialog로 연 이슈 id를 담는 query 이름입니다. 주소를 공유하거나 새로고침해도 같은 이슈가 열립니다. */
const ISSUE_PARAM = "issue";
/** 상세 dialog 옆 패널에 연 이슈 id를 담는 query 이름입니다. */
const SIDE_PARAM = "side";

/** 지금 화면 위에 이슈 상세 dialog를 여는 주소를 만듭니다. 화면이 쓰는 다른 query(이슈 목록의 보기 탭 등)는 그대로 둡니다. */
function useIssueDetailHref(): (location: IssueDetailLocation) => string {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return useCallback(
    (location: IssueDetailLocation) => {
      const params = new URLSearchParams(searchParams);
      params.set(ISSUE_PARAM, location.issue);
      if (location.side) params.set(SIDE_PARAM, location.side);
      else params.delete(SIDE_PARAM);
      return `${pathname}?${params}`;
    },
    [pathname, searchParams],
  );
}

/** 지금 화면 위에 옆 패널 없이 이슈 상세 dialog를 여는 주소를 만듭니다. */
export function useIssueHref(): (issueId: string) => string {
  const detailHref = useIssueDetailHref();
  return useCallback((issueId: string) => detailHref({ issue: issueId, side: null }), [detailHref]);
}

/** 주소에 이슈 id가 있으면 상세 dialog를 엽니다. useSearchParams를 쓰므로 Suspense 안에서 렌더링합니다. */
export function IssueDetailRoute({ embedded = false }: { embedded?: boolean }) {
  const replaceQuery = useQueryReplace();
  const detailHref = useIssueDetailHref();
  const location = useIssueDetailLocation();
  const issueId = location?.issue ?? null;
  const currentWorkspace = useWorkspaces().data?.current ?? null;
  const searchParams = useSearchParams();
  const close = useCallback(() => {
    replaceQuery((params) => {
      params.delete(ISSUE_PARAM);
      params.delete(SIDE_PARAM);
    });
  }, [replaceQuery]);

  const [trail, setTrail] = useState<IssueDetailLocation[]>([]);
  const shown = trail.at(-1);
  if (shown?.issue !== location?.issue || shown?.side !== location?.side) {
    setTrail(nextIssueDetailTrail(trail, location));
  }

  // 열려 있던 상세는 이전 workspace의 이슈입니다. 이 탭이 아니라 다른 탭이나 CLI에서 바꿔도 닫습니다.
  const seenWorkspace = useRef<string | null>(null);
  useEffect(() => {
    if (currentWorkspace === null) return;
    const switched = seenWorkspace.current !== null && seenWorkspace.current !== currentWorkspace;
    seenWorkspace.current = currentWorkspace;
    if (switched && issueId) close();
  }, [currentWorkspace, issueId, close]);

  if (!location || (!embedded && readGraphScope(new URLSearchParams(searchParams)))) return null;
  return (
    <IssueDetailDialog
      embedded={embedded}
      location={location}
      previous={trail.at(-2) ?? null}
      detailHref={detailHref}
      onClose={close}
    />
  );
}

function useIssueDetailLocation(): IssueDetailLocation | null {
  const params = useSearchParams();
  const issue = params.get(ISSUE_PARAM);
  const side = params.get(SIDE_PARAM);
  if (!issue) return null;
  return { issue, side: side && side !== issue ? side : null };
}
