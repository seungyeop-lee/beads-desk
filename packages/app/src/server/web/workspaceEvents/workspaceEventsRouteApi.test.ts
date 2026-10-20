import { beforeEach, expect, test, vi } from "vitest";
import { findWorkspace, onWorkspacesChanged } from "@/server/infra/runtime/serverRuntime";
import { subscribeWorkspaceChanges } from "@/server/infra/workspaceChanges/workspaceChangeFeed";
import { handleWorkspaceEventsRequest } from "./workspaceEventsRouteApi";

vi.mock("@/server/infra/runtime/serverRuntime", () => ({
  findWorkspace: vi.fn<typeof findWorkspace>(),
  onWorkspacesChanged: vi.fn<typeof onWorkspacesChanged>(),
}));
vi.mock("@/server/infra/workspaceChanges/workspaceChangeFeed", () => ({
  subscribeWorkspaceChanges: vi.fn<typeof subscribeWorkspaceChanges>(),
}));

const unsubscribed: string[] = [];
const changeListeners = new Map<string, () => void>();
let notifyListChange: () => void;

beforeEach(() => {
  unsubscribed.length = 0;
  changeListeners.clear();
  vi.mocked(findWorkspace).mockImplementation((slug) =>
    slug === "unknown" ? null : { slug, root: `/work/${slug}` },
  );
  vi.mocked(subscribeWorkspaceChanges).mockReset();
  vi.mocked(subscribeWorkspaceChanges).mockImplementation((root, listener) => {
    changeListeners.set(root, listener);
    return () => unsubscribed.push(root);
  });
  vi.mocked(onWorkspacesChanged).mockImplementation((listener) => {
    notifyListChange = listener;
    return () => unsubscribed.push("list");
  });
});

async function openEvents(query: string, signal?: AbortSignal) {
  const response = handleWorkspaceEventsRequest(
    new Request(`http://localhost/api/events${query}`, { signal }),
  );
  const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
  await reader.read();
  return { response, reader };
}

test("query로 받은 workspace들의 변경을 구독하고, 등록하지 않은 이름은 건너뛴다", async () => {
  const { response } = await openEvents("?workspace=a&workspace=b&workspace=unknown");

  expect(response.headers.get("Content-Type")).toBe("text/event-stream");
  expect(vi.mocked(subscribeWorkspaceChanges).mock.calls.map(([root]) => root)).toEqual([
    "/work/a",
    "/work/b",
  ]);
});

test("workspace DB가 바뀌면 그 workspace 이름을 담아 invalidate를 보낸다", async () => {
  const { reader } = await openEvents("?workspace=a&workspace=b");

  changeListeners.get("/work/b")!();

  expect((await reader.read()).value).toBe('event: invalidate\ndata: {"workspace":"b"}\n\n');
});

test("workspace 목록이 바뀌면 이름 없이 invalidate를 보낸다", async () => {
  const { reader } = await openEvents("?workspace=a");

  notifyListChange();

  expect((await reader.read()).value).toBe("event: invalidate\ndata: {}\n\n");
});

test("요청이 끊기면 모든 구독을 해제하고 stream을 닫는다", async () => {
  const abort = new AbortController();
  const { reader } = await openEvents("?workspace=a", abort.signal);

  abort.abort();

  expect((await reader.read()).done).toBe(true);
  expect(unsubscribed).toEqual(["list", "/work/a"]);
  expect(() => changeListeners.get("/work/a")!()).not.toThrow();
});
