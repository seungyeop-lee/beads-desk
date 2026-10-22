import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState, useSyncExternalStore } from "react";
import {
  nextIssueDetailTrail,
  type IssueDetailLocation,
} from "@/client/modules/issues/domain/issueDetailTrail";
import { graphOriginParams, readGraphScope } from "@/client/ui/address/graphAddress";
import {
  ISSUE_DETAIL_PARAMS,
  ISSUE_PARAM,
  SECTION_PARAM,
  SIDE_PARAM,
} from "@/client/ui/address/issueDetailParams";
import { useQueryReplace } from "@/client/ui/address/useQueryReplace";
import { useScreenPathname } from "@/client/ui/address/workspaceAddress";
import { IssueDetailDialog } from "./detail/IssueDetailDialog";
import type { ListedIssues } from "./detail/listedIssues";

/** 상세 dialog를 열 때 스크롤해 보일 영역입니다. human-gate는 막힌 이슈 상세의 human gate 응답 칸입니다. */
export type IssueDetailSection = "human-gate";

/** 이슈 상세 dialog를 여는 주소를 만듭니다. section을 주면 상세가 그 영역까지 스크롤된 채로 열립니다. */
export type IssueHref = (issueId: string, section?: IssueDetailSection) => string;

/** 지금 화면 위에 이슈 상세 dialog를 여는 주소를 만듭니다. 화면이 쓰는 다른 query(이슈 목록의 보기 탭 등)는 그대로 둡니다. */
function useIssueDetailHref(): (
  location: IssueDetailLocation,
  section?: IssueDetailSection,
) => string {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return useCallback(
    (location: IssueDetailLocation, section?: IssueDetailSection) => {
      const params = new URLSearchParams(searchParams);
      params.set(ISSUE_PARAM, location.issue);
      if (location.side) params.set(SIDE_PARAM, location.side);
      else params.delete(SIDE_PARAM);
      if (section) params.set(SECTION_PARAM, section);
      else params.delete(SECTION_PARAM);
      return `${pathname}?${params}`;
    },
    [pathname, searchParams],
  );
}

/** 지금 화면 위에 옆 패널 없이 이슈 상세 dialog를 여는 주소를 만듭니다. */
export function useIssueHref(): IssueHref {
  const detailHref = useIssueDetailHref();
  return useCallback(
    (issueId: string, section?: IssueDetailSection) =>
      detailHref({ issue: issueId, side: null }, section),
    [detailHref],
  );
}

/**
 * 주소에 이슈 id가 있으면 상세 dialog를 엽니다. useSearchParams를 쓰므로 Suspense 안에서 렌더링합니다.
 * listedIssues는 응답하면 행이 목록에서 빠지는 화면이 넘깁니다.
 */
export function IssueDetailRoute({
  embedded = false,
  listedIssues,
}: {
  embedded?: boolean;
  listedIssues?: ListedIssues;
}) {
  const replaceQuery = useQueryReplace();
  const detailHref = useIssueDetailHref();
  const location = useIssueDetailLocation(embedded);
  const searchParams = useSearchParams();
  const covered = !embedded && readGraphScope(new URLSearchParams(searchParams)) !== null;
  const close = useCallback(() => {
    replaceQuery((params) => {
      for (const name of ISSUE_DETAIL_PARAMS) params.delete(name);
    });
  }, [replaceQuery]);

  const [trail, setTrail] = useState<IssueDetailLocation[]>([]);
  const shown = trail.at(-1);
  if (shown?.issue !== location?.issue || shown?.side !== location?.side) {
    setTrail(nextIssueDetailTrail(trail, location));
  }

  if (!location) return null;
  return (
    <IssueDetailDialog
      embedded={embedded}
      covered={covered}
      onShownChange={embedded ? undefined : setScreenDetailShown}
      listedIssues={listedIssues}
      location={location}
      scrollToHumanGate={searchParams.get(SECTION_PARAM) === "human-gate"}
      previous={trail.at(-2) ?? null}
      detailHref={detailHref}
      onClose={close}
    />
  );
}

/** 그래프 안에 붙여 보는 상세도 issue·side를 쓰므로, 그래프 아래에 깔린 화면의 상세는 그래프를 처음 연 화면 주소에서 위치를 읽습니다. */
function useIssueDetailLocation(embedded: boolean): IssueDetailLocation | null {
  const searchParams = useSearchParams();
  const screenPathname = useScreenPathname();
  const params = new URLSearchParams(searchParams);
  if (embedded || !readGraphScope(params)) return readIssueDetailLocation(params);
  const origin = graphOriginParams(params, screenPathname);
  return origin && readIssueDetailLocation(origin);
}

function readIssueDetailLocation(params: URLSearchParams): IssueDetailLocation | null {
  const issue = params.get(ISSUE_PARAM);
  const side = params.get(SIDE_PARAM);
  if (!issue) return null;
  return { issue, side: side && side !== issue ? side : null };
}

const screenDetail = { shown: false, listeners: new Set<() => void>() };

function setScreenDetailShown(shown: boolean) {
  if (screenDetail.shown === shown) return;
  screenDetail.shown = shown;
  for (const listener of screenDetail.listeners) listener();
}

function subscribeScreenDetail(listener: () => void) {
  screenDetail.listeners.add(listener);
  return () => {
    screenDetail.listeners.delete(listener);
  };
}

/**
 * 그래프 아래에 깔릴 화면의 상세 dialog가 열려 있거나 깔릴 상세가 없으면 true입니다.
 * modal dialog는 나중에 연 것이 위에 놓이므로, 그래프는 이 값이 true가 된 뒤에 열어야 상세 위에 놓입니다.
 * 상세와 그래프가 함께 있는 주소를 새로고침하면 상세는 내용을 받은 뒤에야 열립니다.
 */
export function useScreenDetailReady(): boolean {
  const location = useIssueDetailLocation(false);
  const shown = useSyncExternalStore(
    subscribeScreenDetail,
    () => screenDetail.shown,
    () => false,
  );
  return !location || shown;
}
