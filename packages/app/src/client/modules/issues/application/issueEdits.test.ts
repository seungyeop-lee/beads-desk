import { beforeEach, expect, test, vi } from "vitest";
import {
  closeIssueAction,
  setIssueStatusAction,
  updateIssueAction,
} from "@/server/web/issues/issueActions";
import type { CloseIssueResult } from "@/shared/contract/issueActions";
import { issueEdits, type ClosePrompts } from "./issueEdits";
import type { IssueWrites } from "./useIssueWrites";

vi.mock("@/server/web/issues/issueActions", () => ({
  closeIssueAction: vi.fn<typeof closeIssueAction>(),
  setIssueStatusAction: vi.fn<typeof setIssueStatusAction>(),
  updateIssueAction: vi.fn<typeof updateIssueAction>(),
}));

const writes: IssueWrites = {
  pending: false,
  error: null,
  dismissError: vi.fn<() => void>(),
  run: (write) => write(),
};
const blocked: CloseIssueResult = { ok: false, closeBlocked: true, error: "cannot close\nmore" };
let prompts: ClosePrompts;

beforeEach(() => {
  vi.resetAllMocks();
  prompts = {
    askReason: vi.fn<ClosePrompts["askReason"]>(async () => "끝냄"),
    confirmForce: vi.fn<ClosePrompts["confirmForce"]>(() => true),
    announceUnblocked: vi.fn<ClosePrompts["announceUnblocked"]>(),
  };
});

test("필드를 고치고 성공 여부를 돌려준다", async () => {
  vi.mocked(updateIssueAction).mockResolvedValue({ ok: true, data: null });

  const saved = await issueEdits(writes, "demo-1").update({ assignee: "alice" });

  expect(updateIssueAction).toHaveBeenCalledWith("demo-1", { assignee: "alice" });
  expect(saved).toBe(true);
});

test("닫힘이 아닌 상태는 묻지 않고 바꾼다", async () => {
  vi.mocked(setIssueStatusAction).mockResolvedValue({ ok: true, data: null });

  const changed = await issueEdits(writes, "demo-1").changeStatus("in_progress", prompts);

  expect(setIssueStatusAction).toHaveBeenCalledWith("demo-1", "in_progress");
  expect(prompts.askReason).not.toHaveBeenCalled();
  expect(changed).toBe(true);
});

test("닫힘이면 사유를 물어 그 사유로 닫고, 막힘이 풀린 이슈를 알린다", async () => {
  const unblocked = [{ id: "demo-2", title: "후행" }];
  vi.mocked(closeIssueAction).mockResolvedValue({ ok: true, data: unblocked });

  const changed = await issueEdits(writes, "demo-1").changeStatus("closed", prompts);

  expect(prompts.askReason).toHaveBeenCalledWith("demo-1");
  expect(closeIssueAction).toHaveBeenCalledWith("demo-1", "끝냄", false);
  expect(prompts.announceUnblocked).toHaveBeenCalledWith(unblocked);
  expect(changed).toBe(true);
});

test("막힘이 풀린 이슈가 없으면 알리지 않는다", async () => {
  vi.mocked(closeIssueAction).mockResolvedValue({ ok: true, data: [] });

  await issueEdits(writes, "demo-1").changeStatus("closed", prompts);

  expect(prompts.announceUnblocked).not.toHaveBeenCalled();
});

test("사유 입력을 취소하면 닫지 않고 실패로 돌려준다", async () => {
  vi.mocked(prompts.askReason).mockResolvedValue(null);

  const changed = await issueEdits(writes, "demo-1").changeStatus("closed", prompts);

  expect(closeIssueAction).not.toHaveBeenCalled();
  expect(changed).toBe(false);
});

test("닫기가 거부되면 첫 줄 사유로 확인을 받고, 확인하면 입력한 사유로 강제로 닫는다", async () => {
  vi.mocked(closeIssueAction)
    .mockResolvedValueOnce(blocked)
    .mockResolvedValueOnce({ ok: true, data: [] });

  const changed = await issueEdits(writes, "demo-1").changeStatus("closed", prompts);

  expect(prompts.confirmForce).toHaveBeenCalledWith("cannot close");
  expect(writes.dismissError).toHaveBeenCalledOnce();
  expect(vi.mocked(closeIssueAction).mock.calls).toEqual([
    ["demo-1", "끝냄", false],
    ["demo-1", "끝냄", true],
  ]);
  expect(changed).toBe(true);
});

test("강제로 닫기를 취소하면 다시 요청하지 않고 실패로 돌려준다", async () => {
  vi.mocked(closeIssueAction).mockResolvedValue(blocked);
  vi.mocked(prompts.confirmForce).mockReturnValue(false);

  const changed = await issueEdits(writes, "demo-1").changeStatus("closed", prompts);

  expect(closeIssueAction).toHaveBeenCalledOnce();
  expect(changed).toBe(false);
});
