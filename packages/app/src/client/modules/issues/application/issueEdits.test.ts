import { beforeEach, expect, test, vi } from "vitest";
import { setIssueStatusAction, updateIssueAction } from "@/server/web/issues/issueActions";
import type { StatusChangeResult } from "@/shared/contract/issueActions";
import { issueEdits } from "./issueEdits";
import type { IssueWrites } from "./useIssueWrites";

vi.mock("@/server/web/issues/issueActions", () => ({
  setIssueStatusAction: vi.fn<typeof setIssueStatusAction>(),
  updateIssueAction: vi.fn<typeof updateIssueAction>(),
}));

const writes: IssueWrites = {
  pending: false,
  error: null,
  dismissError: vi.fn<() => void>(),
  run: (write) => write(),
};
const blocked: StatusChangeResult = { ok: false, closeBlocked: true, error: "cannot close\nmore" };

beforeEach(() => {
  vi.resetAllMocks();
});

test("필드를 고치고 성공 여부를 돌려준다", async () => {
  vi.mocked(updateIssueAction).mockResolvedValue({ ok: true, data: null });

  const saved = await issueEdits(writes, "demo-1").update({ assignee: "alice" });

  expect(updateIssueAction).toHaveBeenCalledWith("demo-1", { assignee: "alice" });
  expect(saved).toBe(true);
});

test("닫기가 거부되면 첫 줄 사유로 확인을 받고, 확인하면 강제로 닫는다", async () => {
  vi.mocked(setIssueStatusAction)
    .mockResolvedValueOnce(blocked)
    .mockResolvedValueOnce({ ok: true, data: null });
  const confirmForce = vi.fn<(reason: string) => boolean>(() => true);

  const changed = await issueEdits(writes, "demo-1").changeStatus("closed", confirmForce);

  expect(confirmForce).toHaveBeenCalledWith("cannot close");
  expect(writes.dismissError).toHaveBeenCalledOnce();
  expect(vi.mocked(setIssueStatusAction).mock.calls).toEqual([
    ["demo-1", "closed", false],
    ["demo-1", "closed", true],
  ]);
  expect(changed).toBe(true);
});

test("강제로 닫기를 취소하면 다시 요청하지 않고 실패로 돌려준다", async () => {
  vi.mocked(setIssueStatusAction).mockResolvedValue(blocked);

  const changed = await issueEdits(writes, "demo-1").changeStatus("closed", () => false);

  expect(setIssueStatusAction).toHaveBeenCalledOnce();
  expect(changed).toBe(false);
});
