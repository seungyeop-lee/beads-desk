import { beforeEach, expect, test, vi } from "vitest";
import {
  awaitFirstInvalidation,
  subscribeWorkspaceInvalidation,
} from "@/client/infra/workspaceEvents/workspaceEventSource";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import { watchWorkspaceRead } from "./watchWorkspaceRead";

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

test("데이터를 읽고, workspace가 바뀌면 다시 읽어 넘긴다", async () => {
  const results: ApiResponse<string[]>[] = [];
  watchWorkspaceRead(read, (result) => results.push(result));
  await flush();

  pending[0]!.resolve(ok(["a"]));
  await flush();
  invalidate();
  await flush();
  pending[1]!.resolve(ok(["a", "b"]));
  await flush();

  expect(read).toHaveBeenCalledTimes(2);
  expect(results).toEqual([ok(["a"]), ok(["a", "b"])]);
});

test("첫 알림이 오기 전에는 읽지 않고, 알림이 오면 그 한 번으로 한 번만 읽는다", async () => {
  const results: ApiResponse<string[]>[] = [];
  const firstNotice = Promise.withResolvers<void>();
  vi.mocked(awaitFirstInvalidation).mockImplementationOnce(() => firstNotice.promise);
  watchWorkspaceRead(read, (result) => results.push(result));
  await flush();

  expect(read).not.toHaveBeenCalled();

  firstNotice.resolve();
  invalidate();
  await flush();
  expect(read).toHaveBeenCalledTimes(1);

  pending[0]!.resolve(ok(["a"]));
  await flush();

  expect(results).toEqual([ok(["a"])]);
  expect(read).toHaveBeenCalledTimes(1);
});

test("읽는 중에 여러 번 바뀌어도 읽기가 끝난 뒤 한 번만 다시 읽는다", async () => {
  const results: ApiResponse<string[]>[] = [];
  watchWorkspaceRead(read, (result) => results.push(result));
  await flush();

  invalidate();
  invalidate();
  invalidate();
  expect(read).toHaveBeenCalledTimes(1);

  pending[0]!.resolve(ok(["old"]));
  await flush();
  expect(read).toHaveBeenCalledTimes(2);
  pending[1]!.resolve(ok(["new"]));
  await flush();

  expect(read).toHaveBeenCalledTimes(2);
  expect(results).toEqual([ok(["old"]), ok(["new"])]);
});

test("다시 읽기가 끝난 뒤에 온 알림은 새로 읽는다", async () => {
  watchWorkspaceRead(read, () => {});
  await flush();

  invalidate();
  pending[0]!.resolve(ok(["a"]));
  await flush();
  pending[1]!.resolve(ok(["b"]));
  await flush();
  invalidate();
  await flush();

  expect(read).toHaveBeenCalledTimes(3);
});

test("멈춘 뒤에는 도착한 응답을 넘기지 않고 구독을 해제한다", async () => {
  const results: ApiResponse<string[]>[] = [];
  const stop = watchWorkspaceRead(read, (result) => results.push(result));
  await flush();

  stop();
  pending[0]!.resolve(ok(["a"]));
  await flush();

  expect(results).toEqual([]);
  expect(unsubscribe).toHaveBeenCalledOnce();
});

test("첫 알림을 기다리다 멈추면 읽지 않는다", async () => {
  const firstNotice = Promise.withResolvers<void>();
  vi.mocked(awaitFirstInvalidation).mockImplementationOnce(() => firstNotice.promise);
  const results: ApiResponse<string[]>[] = [];
  const stop = watchWorkspaceRead(read, (result) => results.push(result));

  stop();
  firstNotice.resolve();
  await flush();

  expect(read).not.toHaveBeenCalled();
  expect(results).toEqual([]);
});
