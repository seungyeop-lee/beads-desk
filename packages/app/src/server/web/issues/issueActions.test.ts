import * as bd from "@beads-desk/bd";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { checkWorkspaceChangesNow } from "@/server/infra/workspaceChanges/workspaceChangeFeed";
import type { IssueChanges, LinkableDependencyType } from "@/shared/contract/issueActions";
import {
  addCommentAction,
  addDependencyAction,
  addLabelAction,
  closeIssueAction,
  createIssueAction,
  deleteIssueAction,
  removeDependencyAction,
  removeLabelAction,
  setIssueStatusAction,
  updateIssueAction,
} from "./issueActions";

vi.mock("@beads-desk/bd", () => ({
  addComment: vi.fn<typeof bd.addComment>(),
  addDependency: vi.fn<typeof bd.addDependency>(),
  addLabel: vi.fn<typeof bd.addLabel>(),
  closeIssue: vi.fn<typeof bd.closeIssue>(),
  createIssue: vi.fn<typeof bd.createIssue>(),
  deleteIssue: vi.fn<typeof bd.deleteIssue>(),
  removeDependency: vi.fn<typeof bd.removeDependency>(),
  removeLabel: vi.fn<typeof bd.removeLabel>(),
  setIssueStatus: vi.fn<typeof bd.setIssueStatus>(),
  updateIssueFields: vi.fn<typeof bd.updateIssueFields>(),
}));
vi.mock("@/server/infra/workspaceChanges/workspaceChangeFeed", () => ({
  checkWorkspaceChangesNow: vi.fn<typeof checkWorkspaceChangesNow>(),
}));
// Next 요청 밖에서는 쿠키와 헤더를 읽을 수 없으므로 언어를 정해 둡니다.
vi.mock("@/server/web/locale/requestLocale", () => ({
  requestLocale: () => Promise.resolve("ko"),
}));

const originalWorkspace = process.env.BEADS_DESK_WORKSPACE;
const written = { ok: true, value: null } as const;

beforeEach(() => {
  process.env.BEADS_DESK_WORKSPACE = "/workspace";
});

afterEach(() => {
  process.env.BEADS_DESK_WORKSPACE = originalWorkspace;
  vi.resetAllMocks();
});

describe("updateIssueAction", () => {
  test("workspace에서 필드를 바꾸고, 바로 변경을 확인해 다른 화면에 알린다", async () => {
    vi.mocked(bd.updateIssueFields).mockResolvedValue(written);

    const result = await updateIssueAction("demo-1", { title: "새 제목", priority: 0 });

    expect(bd.updateIssueFields).toHaveBeenCalledWith("/workspace", "demo-1", {
      title: "새 제목",
      priority: 0,
    });
    expect(checkWorkspaceChangesNow).toHaveBeenCalledWith("/workspace");
    expect(result).toEqual({ ok: true, data: null });
  });

  test.each<[string, unknown]>([
    ["모르는 필드", { status: "closed" }],
    ["문자열이 아닌 값", { title: 3 }],
    ["범위를 벗어난 우선순위", { priority: 7 }],
    ["정수가 아닌 우선순위", { priority: 1.5 }],
    ["객체가 아닌 값", "title"],
  ])("%s는 bd를 실행하지 않고 거부한다", async (_case, changes) => {
    const result = await updateIssueAction("demo-1", changes as IssueChanges);

    expect(bd.updateIssueFields).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error: "요청 형식이 올바르지 않습니다." });
  });

  test("bd가 실패하면 메시지를 돌려주고 변경 확인은 하지 않는다", async () => {
    vi.mocked(bd.updateIssueFields).mockResolvedValue({
      ok: false,
      error: { message: "no issue found\n", exitCode: 1 },
    });

    const result = await updateIssueAction("demo-1", { title: "x" });

    expect(checkWorkspaceChangesNow).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error: "no issue found" });
  });
});

describe("setIssueStatusAction", () => {
  test("저장 상태가 아닌 값은 거부한다", async () => {
    const result = await setIssueStatusAction("demo-1", "ready" as bd.IssueStatus);

    expect(bd.setIssueStatus).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error: "요청 형식이 올바르지 않습니다." });
  });

  test("닫힘은 사유를 받는 closeIssueAction으로만 바꾼다", async () => {
    const result = await setIssueStatusAction("demo-1", "closed");

    expect(bd.setIssueStatus).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error: "요청 형식이 올바르지 않습니다." });
  });
});

describe("closeIssueAction", () => {
  test("사유와 함께 닫고, 막힘이 풀린 이슈의 id와 제목을 돌려주며 다른 화면에 알린다", async () => {
    vi.mocked(bd.closeIssue).mockResolvedValue({
      ok: true,
      value: [{ id: "demo-2", title: "후행", status: "open" } as bd.Issue],
    });

    const result = await closeIssueAction("demo-1", "끝냄", false);

    expect(bd.closeIssue).toHaveBeenCalledWith("/workspace", "demo-1", {
      reason: "끝냄",
      force: false,
    });
    expect(result).toEqual({ ok: true, data: [{ id: "demo-2", title: "후행" }] });
    expect(checkWorkspaceChangesNow).toHaveBeenCalledWith("/workspace");
  });

  test("닫기가 거부되면 다시 요청할 수 있다고 알린다", async () => {
    vi.mocked(bd.closeIssue).mockResolvedValue({
      ok: false,
      closeBlocked: true,
      error: { message: "cannot close demo-1\n", exitCode: 1 },
    });

    const result = await closeIssueAction("demo-1", "", false);

    expect(result).toEqual({ ok: false, closeBlocked: true, error: "cannot close demo-1" });
    expect(checkWorkspaceChangesNow).not.toHaveBeenCalled();
  });
});

describe("createIssueAction", () => {
  test("고르지 않은 유형과 우선순위는 bd 기본값을 쓰고, 새 id를 돌려준다", async () => {
    vi.mocked(bd.createIssue).mockResolvedValue({ ok: true, value: "demo-9" });

    const result = await createIssueAction({
      title: "새 이슈",
      issueType: null,
      priority: null,
      description: "본문",
      labels: ["ui"],
      parent: null,
    });

    expect(bd.createIssue).toHaveBeenCalledWith("/workspace", {
      title: "새 이슈",
      description: "본문",
      labels: ["ui"],
    });
    expect(checkWorkspaceChangesNow).toHaveBeenCalledWith("/workspace");
    expect(result).toEqual({ ok: true, data: "demo-9" });
  });

  test("라벨이 문자열 목록이 아니면 거부한다", async () => {
    const result = await createIssueAction({
      title: "새 이슈",
      issueType: null,
      priority: null,
      description: "",
      labels: "ui" as unknown as string[],
      parent: null,
    });

    expect(bd.createIssue).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error: "요청 형식이 올바르지 않습니다." });
  });

  test("고른 상위 이슈를 bd에 넘긴다", async () => {
    vi.mocked(bd.createIssue).mockResolvedValue({ ok: true, value: "demo-9" });

    await createIssueAction({
      title: "하위 이슈",
      issueType: null,
      priority: null,
      description: "",
      labels: [],
      parent: "demo-epic",
    });

    expect(bd.createIssue).toHaveBeenCalledWith("/workspace", {
      title: "하위 이슈",
      description: "",
      labels: [],
      parent: "demo-epic",
    });
  });

  test("상위 이슈가 문자열이나 null이 아니면 거부한다", async () => {
    const result = await createIssueAction({
      title: "하위 이슈",
      issueType: null,
      priority: null,
      description: "",
      labels: [],
      parent: undefined as unknown as null,
    });

    expect(bd.createIssue).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error: "요청 형식이 올바르지 않습니다." });
  });
});

test("댓글, 라벨, 의존 관계, 삭제를 workspace에서 실행한다", async () => {
  for (const write of [
    bd.addComment,
    bd.addLabel,
    bd.removeLabel,
    bd.addDependency,
    bd.removeDependency,
    bd.deleteIssue,
  ]) {
    vi.mocked(write).mockResolvedValue(written);
  }

  const results = [
    await addCommentAction("demo-1", "댓글"),
    await addLabelAction("demo-1", "ui"),
    await removeLabelAction("demo-1", "ui"),
    await addDependencyAction("demo-1", "demo-2", "related"),
    await removeDependencyAction("demo-1", "demo-2"),
    await deleteIssueAction("demo-1"),
  ];

  expect(results.every((result) => result.ok)).toBe(true);
  expect(bd.addComment).toHaveBeenCalledWith("/workspace", "demo-1", "댓글");
  expect(bd.addLabel).toHaveBeenCalledWith("/workspace", "demo-1", "ui");
  expect(bd.removeLabel).toHaveBeenCalledWith("/workspace", "demo-1", "ui");
  expect(bd.addDependency).toHaveBeenCalledWith("/workspace", "demo-1", "demo-2", "related");
  expect(bd.removeDependency).toHaveBeenCalledWith("/workspace", "demo-1", "demo-2");
  expect(bd.deleteIssue).toHaveBeenCalledWith("/workspace", "demo-1");
  expect(checkWorkspaceChangesNow).toHaveBeenCalledTimes(6);
});

test("문자열이 아닌 id는 거부한다", async () => {
  const result = await deleteIssueAction(1 as unknown as string);

  expect(bd.deleteIssue).not.toHaveBeenCalled();
  expect(result).toEqual({ ok: false, error: "요청 형식이 올바르지 않습니다." });
});

test("화면에서 맺을 수 없는 의존 유형은 거부한다", async () => {
  const result = await addDependencyAction(
    "demo-1",
    "demo-2",
    "discovered-from" as unknown as LinkableDependencyType,
  );

  expect(bd.addDependency).not.toHaveBeenCalled();
  expect(result).toEqual({ ok: false, error: "요청 형식이 올바르지 않습니다." });
});
