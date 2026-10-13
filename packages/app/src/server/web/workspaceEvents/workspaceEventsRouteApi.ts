import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import { subscribeWorkspaceChanges } from "@/server/infra/workspaceChanges/workspaceChangeFeed";
import { INVALIDATE_EVENT } from "@/shared/contract/workspaceEvents";

export function handleWorkspaceEventsRequest(request: Request): Response {
  const encoder = new TextEncoder();
  /** 구독을 해제합니다. 이미 해제했으면 false를 돌려줍니다. */
  let stop = () => false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let stopped = false;
      const send = (chunk: string) => {
        if (!stopped) controller.enqueue(encoder.encode(chunk));
      };
      const unsubscribe = subscribeWorkspaceChanges(currentWorkspaceRoot(), () =>
        send(`event: ${INVALIDATE_EVENT}\ndata: {}\n\n`),
      );
      stop = () => {
        if (stopped) return false;
        stopped = true;
        unsubscribe();
        return true;
      };
      // 연결 직후 한 번 보내 응답 header를 내보내고, 연결이 열렸음을 client가 바로 알게 합니다.
      send(": connected\n\n");
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
