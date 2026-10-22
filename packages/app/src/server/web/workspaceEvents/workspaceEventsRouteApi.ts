import { onWorkspacesChanged } from "@/server/infra/runtime/serverRuntime";
import { subscribeWorkspaceChanges } from "@/server/infra/workspaceChanges/workspaceChangeFeed";
import { requestWorkspaces } from "@/server/web/http/requestWorkspace";
import { INVALIDATE_EVENT, type InvalidateNotice } from "@/shared/contract/workspaceEvents";

/**
 * query로 받은 workspace들의 DB 변경을 구독해, 바뀐 workspace의 이름을 담은 invalidate를 보냅니다.
 * 등록하지 않은 이름은 건너뜁니다. 새 workspace를 등록하면 모든 화면이 workspace 목록을 다시 읽도록 이름 없이 보냅니다.
 */
export function handleWorkspaceEventsRequest(request: Request): Response {
  const encoder = new TextEncoder();
  const workspaces = requestWorkspaces(request);
  /** 구독을 해제합니다. 이미 해제했으면 false를 돌려줍니다. */
  let stop = () => false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let stopped = false;
      const send = (notice: InvalidateNotice) => {
        if (stopped) return;
        controller.enqueue(
          encoder.encode(`event: ${INVALIDATE_EVENT}\ndata: ${JSON.stringify(notice)}\n\n`),
        );
      };
      const unsubscribes = [
        onWorkspacesChanged(() => send({})),
        ...workspaces.map((workspace) =>
          subscribeWorkspaceChanges(workspace.root, () => send({ workspace: workspace.slug })),
        ),
      ];
      stop = () => {
        if (stopped) return false;
        stopped = true;
        for (const unsubscribe of unsubscribes) unsubscribe();
        return true;
      };
      // 연결 직후 한 번 보내 응답 header를 내보내고, 연결이 열렸음을 client가 바로 알게 합니다.
      controller.enqueue(encoder.encode(": connected\n\n"));
      request.signal.addEventListener(
        "abort",
        () => {
          if (stop()) controller.close();
        },
        { once: true },
      );
    },
    cancel() {
      stop();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
