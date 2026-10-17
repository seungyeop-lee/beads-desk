import { beforeEach, expect, test, vi } from "vitest";
import {
  awaitFirstInvalidation,
  subscribeWorkspaceInvalidation,
} from "@/client/infra/workspaceEvents/workspaceEventSource";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import { shareWorkspaceRead } from "./shareWorkspaceRead";

vi.mock("@/client/infra/workspaceEvents/workspaceEventSource", () => ({
  awaitFirstInvalidation: vi.fn<typeof awaitFirstInvalidation>(),
  subscribeWorkspaceInvalidation: vi.fn<typeof subscribeWorkspaceInvalidation>(),
}));

type Pending = { resolve: (result: ApiResponse<string[]>) => void };

let pending: Pending[];
let invalidate: () => void;
const unsubscribe = vi.fn<() => void>();
const read = vi.fn<() => Promise<ApiResponse<string[]>>>();

beforeEach(() => {
  pending = [];
  unsubscribe.mockReset();
  read.mockReset();
  read.mockImplementation(() => new Promise((resolve) => pending.push({ resolve })));
  vi.mocked(awaitFirstInvalidation).mockReset();
  vi.mocked(awaitFirstInvalidation).mockResolvedValue(undefined);
  vi.mocked(subscribeWorkspaceInvalidation).mockImplementation((listener) => {
    invalidate = listener;
    return unsubscribe;
  });
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const ok = (data: string[]) => ({ ok: true, data }) as const;

test("구독자가 여럿이어도 처음과 workspace가 바뀔 때마다 한 번씩만 읽고 모든 구독자에게 알린다", async () => {
  const shared = shareWorkspaceRead(read);
  const first = vi.fn<() => void>();
  const second = vi.fn<() => void>();
  shared.subscribe(first);
  shared.subscribe(second);
  await flush();
  expect(shared.getSnapshot()).toEqual({ data: null, error: null, loading: true });

  pending[0]!.resolve(ok(["a"]));
  await flush();
  invalidate();
  await flush();
  pending[1]!.resolve(ok(["a", "b"]));
  await flush();

  expect(read).toHaveBeenCalledTimes(2);
  expect(first).toHaveBeenCalledTimes(2);
  expect(second).toHaveBeenCalledTimes(2);
  expect(shared.getSnapshot()).toEqual({ data: ["a", "b"], error: null, loading: false });
});

test("나중에 구독한 쪽은 다시 읽지 않고 이미 받은 결과를 본다", async () => {
  const shared = shareWorkspaceRead(read);
  shared.subscribe(() => {});
  await flush();
  pending[0]!.resolve(ok(["a"]));
  await flush();

  shared.subscribe(() => {});

  expect(read).toHaveBeenCalledOnce();
  expect(shared.getSnapshot().data).toEqual(["a"]);
});

test("다시 읽다 실패하면 마지막 데이터를 유지한 채 오류를 남긴다", async () => {
  const shared = shareWorkspaceRead(read);
  shared.subscribe(() => {});
  await flush();
  pending[0]!.resolve(ok(["a"]));
  await flush();
  invalidate();
  await flush();
  pending[1]!.resolve({ ok: false, error: "boom" });
  await flush();

  expect(shared.getSnapshot()).toEqual({ data: ["a"], error: "boom", loading: false });
});

test("마지막 구독자가 떠나면 알림 구독을 해제하고, 다시 구독하면 처음부터 읽는다", async () => {
  const shared = shareWorkspaceRead(read);
  const stopFirst = shared.subscribe(() => {});
  const stopSecond = shared.subscribe(() => {});
  await flush();
  pending[0]!.resolve(ok(["a"]));
  await flush();

  stopFirst();
  expect(unsubscribe).not.toHaveBeenCalled();
  stopSecond();
  expect(unsubscribe).toHaveBeenCalledOnce();

  shared.subscribe(() => {});
  await flush();
  expect(shared.getSnapshot()).toEqual({ data: null, error: null, loading: true });
  expect(read).toHaveBeenCalledTimes(2);
});
