import { beforeEach, expect, test, vi } from "vitest";
import { onWorkspacesChanged } from "@/server/infra/runtime/serverRuntime";
import { subscribeCurrentWorkspaceChanges } from "./currentWorkspaceChanges";
import { subscribeWorkspaceChanges } from "./workspaceChangeFeed";

let current = "/a";
let changed: () => void;
const stopFollowing = vi.fn<() => void>();
const unsubscribed: string[] = [];

vi.mock("@/server/infra/runtime/serverRuntime", () => ({
  currentWorkspaceRoot: () => current,
  onWorkspacesChanged: vi.fn<typeof onWorkspacesChanged>(),
}));
vi.mock("./workspaceChangeFeed", () => ({
  subscribeWorkspaceChanges: vi.fn<typeof subscribeWorkspaceChanges>(),
}));

beforeEach(() => {
  current = "/a";
  unsubscribed.length = 0;
  stopFollowing.mockReset();
  vi.mocked(subscribeWorkspaceChanges).mockReset();
  vi.mocked(subscribeWorkspaceChanges).mockImplementation((root) => () => unsubscribed.push(root));
  vi.mocked(onWorkspacesChanged).mockImplementation((listener) => {
    changed = listener;
    return stopFollowing;
  });
});

test("현재 workspace를 바꾸면 새 workspace의 변경을 구독하고, 알림은 새 구독에 맡긴다", () => {
  const listener = vi.fn<() => void>();
  subscribeCurrentWorkspaceChanges(listener);

  current = "/b";
  changed();

  expect(vi.mocked(subscribeWorkspaceChanges).mock.calls.map(([root, l]) => [root, l])).toEqual([
    ["/a", listener],
    ["/b", listener],
  ]);
  expect(unsubscribed).toEqual(["/a"]);
  expect(listener).not.toHaveBeenCalled();
});

test("workspace 목록만 바뀌면 구독은 그대로 두고 알린다", () => {
  const listener = vi.fn<() => void>();
  subscribeCurrentWorkspaceChanges(listener);

  changed();

  expect(subscribeWorkspaceChanges).toHaveBeenCalledOnce();
  expect(unsubscribed).toEqual([]);
  expect(listener).toHaveBeenCalledOnce();
});

test("구독을 해제하면 workspace 전환도 더 따라가지 않는다", () => {
  const unsubscribe = subscribeCurrentWorkspaceChanges(() => {});

  unsubscribe();

  expect(unsubscribed).toEqual(["/a"]);
  expect(stopFollowing).toHaveBeenCalledOnce();
});
