import { useState } from "react";
import { readActivityFeed } from "@/client/infra/activityFeed/activityFeedApiClient";
import {
  activityFeedQuery,
  type ActivityDateRange,
} from "@/client/modules/activityFeed/domain/activityFeedView";
import { useWorkspaceRead } from "@/client/modules/workspace/application/useWorkspaceRead";
import { activityFeedPath, type ActivityFeedPage } from "@/shared/contract/activityFeed";

export type ActivityFeed = {
  /** 아직 한 번도 받지 못했으면 null입니다. 더 읽는 동안에는 지금까지 받은 기록을 그대로 둡니다. */
  page: ActivityFeedPage | null;
  error: string | null;
  loading: boolean;
  /** 지금까지 읽은 기록 다음의 기록을 한 쪽 더 읽습니다. */
  showMore: () => void;
};

/**
 * 날짜 범위 안의 기록을 새것부터 한 쪽씩 늘려 읽고, workspace가 바뀌면 다시 읽습니다.
 * 더 읽을 때는 처음부터 늘린 개수만큼 다시 읽습니다. 그 사이 새 기록이 생겨도 앞에서 이미 본 기록이 빠지거나 겹치지 않게 하기 위해서입니다.
 * 날짜 범위를 바꾸면 첫 쪽부터 다시 읽습니다.
 */
export function useActivityFeed(range: ActivityDateRange): ActivityFeed {
  const rangeKey = `${range.from ?? ""}~${range.to ?? ""}`;
  const [paging, setPaging] = useState({ rangeKey, pages: 1 });
  const pages = paging.rangeKey === rangeKey ? paging.pages : 1;
  const { data, error, loading } = useWorkspaceRead(
    activityFeedPath(activityFeedQuery(range, pages)),
    readActivityFeed,
  );

  // 쪽 수를 늘리면 조회 key가 바뀌어 새 응답이 올 때까지 data가 비므로, 같은 범위에서 받은 마지막 기록을 보여 줍니다.
  const [kept, setKept] = useState<{ rangeKey: string; page: ActivityFeedPage } | null>(null);
  if (data !== null && kept?.page !== data) setKept({ rangeKey, page: data });
  const page = data ?? (kept?.rangeKey === rangeKey ? kept.page : null);

  return {
    page,
    error,
    loading,
    showMore: () => setPaging({ rangeKey, pages: pages + 1 }),
  };
}
