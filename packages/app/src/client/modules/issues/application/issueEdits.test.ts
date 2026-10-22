import { beforeEach, expect, test, vi } from "vitest";
import type { LinkedIssue } from "@/client/modules/issues/domain/issueRelations";
import {
  addCommentAction,
  addDependencyAction,
  addLabelAction,
  closeAsReplacedAction,
  closeIssueAction,
  deferIssueAction,
  deleteIssueAction,
  dismissHumanAction,
  removeDependencyAction,
  removeLabelAction,
  respondToHumanAction,
  setIssueStatusAction,
  updateIssueAction,
} from "@/server/web/issues/issueActions";
import type { CloseIssueResult } from "@/shared/contract/issueActions";
import { issueEdits, type CloseAsReplacedPrompts, type StatusPrompts } from "./issueEdits";
import type { IssueWrites } from "./useIssueWrites";

vi.mock("@/server/web/issues/issueActions", () => ({
  addCommentAction: vi.fn<typeof addCommentAction>(),
  addDependencyAction: vi.fn<typeof addDependencyAction>(),
  addLabelAction: vi.fn<typeof addLabelAction>(),
  closeAsReplacedAction: vi.fn<typeof closeAsReplacedAction>(),
  closeIssueAction: vi.fn<typeof closeIssueAction>(),
  deferIssueAction: vi.fn<typeof deferIssueAction>(),
  deleteIssueAction: vi.fn<typeof deleteIssueAction>(),
  dismissHumanAction: vi.fn<typeof dismissHumanAction>(),
  removeDependencyAction: vi.fn<typeof removeDependencyAction>(),
  removeLabelAction: vi.fn<typeof removeLabelAction>(),
  respondToHumanAction: vi.fn<typeof respondToHumanAction>(),
  setIssueStatusAction: vi.fn<typeof setIssueStatusAction>(),
  updateIssueAction: vi.fn<typeof updateIssueAction>(),
}));

const writes: IssueWrites = {
  pending: false,
  error: null,
  dismissError: vi.fn<() => void>(),
  run: (write) => write("demo"),
};
const blocked: CloseIssueResult = { ok: false, closeBlocked: true, error: "cannot close\nmore" };
let prompts: StatusPrompts;

beforeEach(() => {
  vi.resetAllMocks();
  prompts = {
    askReason: vi.fn<StatusPrompts["askReason"]>(async () => "끝냄"),
    confirmForce: vi.fn<StatusPrompts["confirmForce"]>(() => true),
    announceUnblocked: vi.fn<StatusPrompts["announceUnblocked"]>(),
    askDeferral: vi.fn<StatusPrompts["askDeferral"]>(async () => ({
      until: "tomorrow",
      reason: "대기",
    })),
  };
});

test("필드를 고치고 성공 여부를 돌려준다", async () => {
  vi.mocked(updateIssueAction).mockResolvedValue({ ok: true, data: null });

  const saved = await issueEdits(writes, "demo-1").update({ assignee: "alice" });

  expect(updateIssueAction).toHaveBeenCalledWith("demo", "demo-1", { assignee: "alice" });
  expect(saved).toBe(true);
});

test("닫힘과 보류가 아닌 상태는 묻지 않고 바꾼다", async () => {
  vi.mocked(setIssueStatusAction).mockResolvedValue({ ok: true, data: null });

  const changed = await issueEdits(writes, "demo-1").changeStatus("in_progress", prompts);

  expect(setIssueStatusAction).toHaveBeenCalledWith("demo", "demo-1", "in_progress");
  expect(prompts.askReason).not.toHaveBeenCalled();
  expect(prompts.askDeferral).not.toHaveBeenCalled();
  expect(changed).toBe(true);
});

test("닫힘이면 사유를 물어 그 사유로 닫고, 막힘이 풀린 이슈를 알린다", async () => {
  const unblocked = [{ id: "demo-2", title: "후행" }];
  vi.mocked(closeIssueAction).mockResolvedValue({ ok: true, data: unblocked });

  const changed = await issueEdits(writes, "demo-1").changeStatus("closed", prompts);

  expect(prompts.askReason).toHaveBeenCalledWith("demo-1");
  expect(closeIssueAction).toHaveBeenCalledWith("demo", "demo-1", "끝냄", false);
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
    ["demo", "demo-1", "끝냄", false],
    ["demo", "demo-1", "끝냄", true],
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

test("보류면 기한과 사유를 물어 그대로 보류한다", async () => {
  vi.mocked(deferIssueAction).mockResolvedValue({ ok: true, data: null });

  const changed = await issueEdits(writes, "demo-1").changeStatus("deferred", prompts);

  expect(prompts.askDeferral).toHaveBeenCalledWith("demo-1");
  expect(deferIssueAction).toHaveBeenCalledWith("demo", "demo-1", "tomorrow", "대기");
  expect(setIssueStatusAction).not.toHaveBeenCalled();
  expect(changed).toBe(true);
});

test("보류 입력을 취소하면 보류하지 않고 실패로 돌려준다", async () => {
  vi.mocked(prompts.askDeferral).mockResolvedValue(null);

  const changed = await issueEdits(writes, "demo-1").changeStatus("deferred", prompts);

  expect(deferIssueAction).not.toHaveBeenCalled();
  expect(changed).toBe(false);
});

test("대체·중복으로 닫기는 확인을 받은 뒤에 닫고, 성공하면 안내한다", async () => {
  const order: string[] = [];
  const closePrompts = {
    confirm: vi.fn<CloseAsReplacedPrompts["confirm"]>(() => {
      order.push("confirm");
      return true;
    }),
    announce: vi.fn<CloseAsReplacedPrompts["announce"]>(() => order.push("announce")),
  };
  vi.mocked(closeAsReplacedAction).mockImplementation(async () => {
    order.push("write");
    return { ok: true, data: null };
  });

  const closed = await issueEdits(writes, "demo-1").closeAsReplaced(
    "supersede",
    "demo-2",
    closePrompts,
  );

  expect(order).toEqual(["confirm", "write", "announce"]);
  expect(closeAsReplacedAction).toHaveBeenCalledWith("demo", "demo-1", "supersede", "demo-2");
  expect(closed).toBe(true);
});

test("대체·중복 닫기 확인을 거절하면 닫지 않고 실패로 돌려준다", async () => {
  const closePrompts = {
    confirm: vi.fn<CloseAsReplacedPrompts["confirm"]>(() => false),
    announce: vi.fn<CloseAsReplacedPrompts["announce"]>(),
  };

  const closed = await issueEdits(writes, "demo-1").closeAsReplaced(
    "duplicate",
    "demo-2",
    closePrompts,
  );

  expect(closeAsReplacedAction).not.toHaveBeenCalled();
  expect(closePrompts.announce).not.toHaveBeenCalled();
  expect(closed).toBe(false);
});

test("대체·중복으로 닫기가 실패하면 안내하지 않고 실패로 돌려준다", async () => {
  const closePrompts = {
    confirm: vi.fn<CloseAsReplacedPrompts["confirm"]>(() => true),
    announce: vi.fn<CloseAsReplacedPrompts["announce"]>(),
  };
  vi.mocked(closeAsReplacedAction).mockResolvedValue({ ok: false, error: "거부" });

  const closed = await issueEdits(writes, "demo-1").closeAsReplaced(
    "duplicate",
    "demo-2",
    closePrompts,
  );

  expect(closeAsReplacedAction).toHaveBeenCalledWith("demo", "demo-1", "duplicate", "demo-2");
  expect(closePrompts.announce).not.toHaveBeenCalled();
  expect(closed).toBe(false);
});

test("관계 추가는 고른 관계의 방향으로 연결하고, 성공하면 안내한다", async () => {
  const order: string[] = [];
  vi.mocked(addDependencyAction).mockImplementation(async () => {
    order.push("write");
    return { ok: true, data: null };
  });

  const added = await issueEdits(writes, "demo-1").addRelation("blocks", "demo-2", () =>
    order.push("announce"),
  );

  // 후속 이슈를 맺으면 고른 이슈가 지금 이슈에 막힙니다.
  expect(addDependencyAction).toHaveBeenCalledWith("demo", "demo-2", "demo-1", "blocks");
  expect(order).toEqual(["write", "announce"]);
  expect(added).toBe(true);
});

test("관계 추가가 실패하면 안내하지 않고 실패로 돌려준다", async () => {
  vi.mocked(addDependencyAction).mockResolvedValue({ ok: false, error: "거부" });

  const added = await issueEdits(writes, "demo-1").addRelation("blockedBy", "demo-2", () => {
    throw new Error("안내하면 안 됩니다");
  });

  expect(added).toBe(false);
});

test("사람 판단 응답은 응답을 보내고, 성공하면 알린다", async () => {
  const order: string[] = [];
  vi.mocked(respondToHumanAction).mockImplementation(async () => {
    order.push("write");
    return { ok: true, data: null };
  });

  const responded = await issueEdits(writes, "demo-1").respondToHuman("진행합니다", () =>
    order.push("announce"),
  );

  expect(respondToHumanAction).toHaveBeenCalledWith("demo", "demo-1", "진행합니다");
  expect(order).toEqual(["write", "announce"]);
  expect(responded).toBe(true);
});

test("사람 판단 응답 없이 닫기는 사유를 보내고, 실패하면 알리지 않는다", async () => {
  vi.mocked(dismissHumanAction).mockResolvedValue({ ok: false, error: "거부" });

  const dismissed = await issueEdits(writes, "demo-1").dismissHuman("중복", () => {
    throw new Error("알리면 안 됩니다");
  });

  expect(dismissHumanAction).toHaveBeenCalledWith("demo", "demo-1", "중복");
  expect(dismissed).toBe(false);
});

test("연결 끊기는 확인을 받은 뒤에 끊고, 선행은 이 이슈에서, 후속은 이 이슈로 끊는다", async () => {
  vi.mocked(removeDependencyAction).mockResolvedValue({ ok: true, data: null });

  const removedDependency = await issueEdits(writes, "demo-1").removeDependency(
    linked("dependencies"),
    () => true,
  );
  const removedDependent = await issueEdits(writes, "demo-1").removeDependency(
    linked("dependents"),
    () => true,
  );

  expect(removeDependencyAction).toHaveBeenCalledWith("demo", "demo-1", "demo-2");
  expect(removeDependencyAction).toHaveBeenCalledWith("demo", "demo-2", "demo-1");
  expect([removedDependency, removedDependent]).toEqual([true, true]);
});

test("연결 끊기 확인을 거절하면 끊지 않고 실패로 돌려준다", async () => {
  const removed = await issueEdits(writes, "demo-1").removeDependency(
    linked("dependencies"),
    () => false,
  );

  expect(removeDependencyAction).not.toHaveBeenCalled();
  expect(removed).toBe(false);
});

test("지우기는 확인을 받은 뒤에 지우고, 성공하면 화면이 넘긴 일을 한다", async () => {
  const order: string[] = [];
  vi.mocked(deleteIssueAction).mockImplementation(async () => {
    order.push("write");
    return { ok: true, data: null };
  });

  const removed = await issueEdits(writes, "demo-1").remove(
    () => {
      order.push("confirm");
      return true;
    },
    () => order.push("deleted"),
  );

  expect(order).toEqual(["confirm", "write", "deleted"]);
  expect(deleteIssueAction).toHaveBeenCalledWith("demo", "demo-1");
  expect(removed).toBe(true);
});

test("지우기 확인을 거절하면 지우지 않고 실패로 돌려준다", async () => {
  const removed = await issueEdits(writes, "demo-1").remove(
    () => false,
    () => {
      throw new Error("화면이 넘긴 일을 하면 안 됩니다");
    },
  );

  expect(deleteIssueAction).not.toHaveBeenCalled();
  expect(removed).toBe(false);
});

test("지우기가 실패하면 화면이 넘긴 일을 하지 않고 실패로 돌려준다", async () => {
  vi.mocked(deleteIssueAction).mockResolvedValue({ ok: false, error: "거부" });

  const removed = await issueEdits(writes, "demo-1").remove(
    () => true,
    () => {
      throw new Error("화면이 넘긴 일을 하면 안 됩니다");
    },
  );

  expect(removed).toBe(false);
});

test("댓글과 라벨 쓰기는 이 이슈에 대해 실행하고 성공 여부를 돌려준다", async () => {
  vi.mocked(addCommentAction).mockResolvedValue({ ok: true, data: null });
  vi.mocked(addLabelAction).mockResolvedValue({ ok: true, data: null });
  vi.mocked(removeLabelAction).mockResolvedValue({ ok: false, error: "거부" });

  const commented = await issueEdits(writes, "demo-1").addComment("메모");
  const labeled = await issueEdits(writes, "demo-1").addLabel("bug");
  await issueEdits(writes, "demo-1").removeLabel("bug");

  expect(addCommentAction).toHaveBeenCalledWith("demo", "demo-1", "메모");
  expect(addLabelAction).toHaveBeenCalledWith("demo", "demo-1", "bug");
  expect(removeLabelAction).toHaveBeenCalledWith("demo", "demo-1", "bug");
  expect([commented, labeled]).toEqual([true, true]);
});

function linked(side: "dependencies" | "dependents"): LinkedIssue {
  return {
    side,
    link: {
      id: "demo-2",
      title: "연결",
      status: "open",
      priority: 2,
      issueType: "task",
      dependencyType: "blocks",
      awaitType: "",
    },
  };
}
