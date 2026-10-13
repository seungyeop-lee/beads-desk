import { beforeEach, expect, test, vi } from "vitest";
import { subscribeWorkspaceChanges } from "@/server/infra/workspaceChanges/workspaceChangeFeed";
import { handleWorkspaceEventsRequest } from "./workspaceEventsRouteApi";

vi.mock("@/server/infra/workspaceChanges/workspaceChangeFeed", () => ({
  subscribeWorkspaceChanges: vi.fn<typeof subscribeWorkspaceChanges>(),
}));
vi.mock("@/server/infra/runtime/serverRuntime", () => ({
  currentWorkspaceRoot: () => "/workspace",
}));

const unsubscribe = vi.fn<() => void>();
let notifyChange: () => void;

beforeEach(() => {
  unsubscribe.mockReset();
  vi.mocked(subscribeWorkspaceChanges).mockImplementation((_root, listener) => {
    notifyChange = listener;
    return unsubscribe;
  });
});

test("현재 workspace의 변경을 구독하고 SSE 응답을 연다", () => {
  const response = handleWorkspaceEventsRequest(new Request("http://localhost/api/events"));

  expect(response.headers.get("Content-Type")).toBe("text/event-stream");
  expect(vi.mocked(subscribeWorkspaceChanges).mock.calls[0]?.[0]).toBe("/workspace");
});

test("workspace가 바뀌면 invalidate 이벤트를 보낸다", async () => {
  const response = handleWorkspaceEventsRequest(new Request("http://localhost/api/events"));
  const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
  await reader.read();

  notifyChange();

  expect((await reader.read()).value).toBe("event: invalidate\ndata: {}\n\n");
});

test("요청이 끊기면 구독을 해제하고 stream을 닫는다", async () => {
  const abort = new AbortController();
  const response = handleWorkspaceEventsRequest(
    new Request("http://localhost/api/events", { signal: abort.signal }),
  );
  const reader = response.body!.getReader();
  await reader.read();

  abort.abort();

  expect((await reader.read()).done).toBe(true);
  expect(unsubscribe).toHaveBeenCalledOnce();
  expect(() => notifyChange()).not.toThrow();
});
