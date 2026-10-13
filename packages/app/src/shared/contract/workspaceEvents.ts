/** workspace 변경 알림을 보내는 SSE 경로입니다. */
export const WORKSPACE_EVENTS_PATH = "/api/events";

/** workspace DB가 바뀌었다는 이벤트입니다. 데이터는 담지 않으며, client는 보고 있는 데이터를 다시 조회합니다. */
export const INVALIDATE_EVENT = "invalidate";
