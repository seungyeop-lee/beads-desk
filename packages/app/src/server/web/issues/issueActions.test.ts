import * as bd from "@beads-desk/bd";
import type { IssueStatus } from "@beads-desk/bd/issue";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { checkWorkspaceChangesNow } from "@/server/infra/workspaceChanges/workspaceChangeFeed";
import type {
  DeferUntil,
  IssueChanges,
  LinkableDependencyType,
  Replacement,
} from "@/shared/contract/issueActions";
import { issue } from "@/shared/domain/issues/issueFixture";
import {
  addCommentAction,
  addDependencyAction,
  addLabelAction,
  claimIssueAction,
  closeAsReplacedAction,
  closeIssueAction,
  createIssueAction,
  deferIssueAction,
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
  claimIssue: vi.fn<typeof bd.claimIssue>(),
  closeAsReplaced: vi.fn<typeof bd.closeAsReplaced>(),
  closeIssue: vi.fn<typeof bd.closeIssue>(),
  createIssue: vi.fn<typeof bd.createIssue>(),
  deferIssue: vi.fn<typeof bd.deferIssue>(),
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

  test("bd adapter가 입력을 거부하면 오류 종류를 요청 언어의 문구로 바꿔 돌려준다", async () => {
    vi.mocked(bd.updateIssueFields).mockResolvedValue({
      ok: false,
      error: { kind: "noChanges", exitCode: null },
    });

    const result = await updateIssueAction("demo-1", {});

    expect(checkWorkspaceChangesNow).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error: "바꿀 내용이 없습니다." });
  });
});

describe("setIssueStatusAction", () => {
  test("저장 상태가 아닌 값은 거부한다", async () => {
    const result = await setIssueStatusAction("demo-1", "ready" as IssueStatus);

    expect(bd.setIssueStatus).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error: "요청 형식이 올바르지 않습니다." });
  });

  test.each<IssueStatus>(["closed", "deferred"])(
    "%s는 사유를 받는 전용 action으로만 바꾼다",
    async (status) => {
      const result = await setIssueStatusAction("demo-1", status);

      expect(bd.setIssueStatus).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: false, error: "요청 형식이 올바르지 않습니다." });
    },
  );
});

describe("deferIssueAction", () => {
  test.each<DeferUntil>(["week", { date: "2026-12-01" }])(
    "기한 %o와 사유로 보류하고 다른 화면에 알린다",
    async (until) => {
      vi.mocked(bd.deferIssue).mockResolvedValue(written);

      const result = await deferIssueAction("demo-1", until, "API 대기");

      expect(bd.deferIssue).toHaveBeenCalledWith("/workspace", "demo-1", {
        until,
        reason: "API 대기",
      });
      expect(result).toEqual({ ok: true, data: null });
      expect(checkWorkspaceChangesNow).toHaveBeenCalledWith("/workspace");
    },
  );

  test.each<[string, unknown]>([
    ["정해 두지 않은 기한 표기", "+3d"],
    ["문자열이 아닌 날짜", { date: 20261201 }],
    ["날짜 말고 다른 필드가 있는 값", { date: "2026-12-01", time: "09:00" }],
    ["null", null],
  ])("%s는 거부한다", async (_case, until) => {
    const result = await deferIssueAction("demo-1", until as DeferUntil, "");

    expect(bd.deferIssue).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error: "요청 형식이 올바르지 않습니다." });
  });
});

describe("claimIssueAction", () => {
  test("이슈를 가져가고 다른 화면에 알린다", async () => {
    vi.mocked(bd.claimIssue).mockResolvedValue(written);

    const result = await claimIssueAction("demo-1");

    expect(bd.claimIssue).toHaveBeenCalledWith("/workspace", "demo-1");
    expect(result).toEqual({ ok: true, data: null });
    expect(checkWorkspaceChangesNow).toHaveBeenCalledWith("/workspace");
  });

  test("문자열이 아닌 id는 거부한다", async () => {
    const result = await claimIssueAction(1 as unknown as string);

    expect(bd.claimIssue).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error: "요청 형식이 올바르지 않습니다." });
  });
});

describe("closeIssueAction", () => {
  test("사유와 함께 닫고, 막힘이 풀린 이슈의 id와 제목을 돌려주며 다른 화면에 알린다", async () => {
    vi.mocked(bd.closeIssue).mockResolvedValue({
      ok: true,
      value: [issue("demo-2", { title: "후행" })],
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

describe("closeAsReplacedAction", () => {
  test("대체나 중복으로 닫고 다른 화면에 알린다", async () => {
    vi.mocked(bd.closeAsReplaced).mockResolvedValue(written);

    const result = await closeAsReplacedAction("demo-1", "duplicate", "demo-2");

    expect(bd.closeAsReplaced).toHaveBeenCalledWith("/workspace", "demo-1", "duplicate", "demo-2");
    expect(result).toEqual({ ok: true, data: null });
    expect(checkWorkspaceChangesNow).toHaveBeenCalledWith("/workspace");
  });

  test("대체와 중복이 아닌 방법은 거부한다", async () => {
    const result = await closeAsReplacedAction("demo-1", "close" as Replacement, "demo-2");

    expect(bd.closeAsReplaced).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error: "요청 형식이 올바르지 않습니다." });
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
