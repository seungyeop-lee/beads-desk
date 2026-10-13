import { beforeEach, expect, test, vi } from "vitest";
import { subscribeWorkspaceInvalidation } from "@/client/infra/workspaceEvents/workspaceEventSource";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import { watchWorkspaceRead } from "./watchWorkspaceRead";

vi.mock("@/client/infra/workspaceEvents/workspaceEventSource", () => ({
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
  vi.mocked(subscribeWorkspaceInvalidation).mockImplementation((listener) => {
    invalidate = listener;
    return unsubscribe;
  });
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const ok = (data: string[]) => ({ ok: true, data }) as const;

test("데이터를 읽고, workspace가 바뀌면 다시 읽어 넘긴다", async () => {
  const results: ApiResponse<string[]>[] = [];
  watchWorkspaceRead(read, (result) => results.push(result));

  pending[0]!.resolve(ok(["a"]));
  await flush();
  invalidate();
  pending[1]!.resolve(ok(["a", "b"]));
  await flush();

  expect(read).toHaveBeenCalledTimes(2);
  expect(results).toEqual([ok(["a"]), ok(["a", "b"])]);
});

test("나중에 보낸 요청보다 늦게 도착한 이전 응답은 버린다", async () => {
  const results: ApiResponse<string[]>[] = [];
  watchWorkspaceRead(read, (result) => results.push(result));

  invalidate();
  pending[1]!.resolve(ok(["new"]));
  await flush();
  pending[0]!.resolve(ok(["old"]));
  await flush();

  expect(results).toEqual([ok(["new"])]);
});

test("멈춘 뒤에는 도착한 응답을 넘기지 않고 구독을 해제한다", async () => {
  const results: ApiResponse<string[]>[] = [];
  const stop = watchWorkspaceRead(read, (result) => results.push(result));

  stop();
  pending[0]!.resolve(ok(["a"]));
  await flush();

  expect(results).toEqual([]);
  expect(unsubscribe).toHaveBeenCalledOnce();
});
