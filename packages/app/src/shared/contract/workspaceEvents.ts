import { WORKSPACE_QUERY } from "./workspaces";

/** workspace 변경 알림을 보내는 SSE 경로입니다. */
export const WORKSPACE_EVENTS_PATH = "/api/events";

/** workspace DB가 바뀌었다는 이벤트입니다. 다시 읽을 데이터는 담지 않습니다. */
export const INVALIDATE_EVENT = "invalidate";

/**
 * invalidate 이벤트의 data입니다. workspace가 있으면 그 이름의 workspace를 보는 화면만 다시 읽습니다.
 * 없으면 workspace 목록이 바뀐 것이라 모든 화면이 다시 읽습니다.
 */
export type InvalidateNotice = { workspace?: string };

/** 감시할 workspace 이름들을 query로 붙인 SSE 주소입니다. 연결 하나가 여러 workspace를 함께 감시합니다. */
export function workspaceEventsUrl(workspaces: readonly string[]): string {
  const params = new URLSearchParams(workspaces.map((slug) => [WORKSPACE_QUERY, slug]));
  return params.size > 0 ? `${WORKSPACE_EVENTS_PATH}?${params}` : WORKSPACE_EVENTS_PATH;
}
