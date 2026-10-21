import type { BdOutcome, CloseOutcome } from "@beads-desk/bd";
import { describe, expect, test, vi } from "vitest";
import { checkWorkspaceChangesNow } from "@/server/infra/workspaceChanges/workspaceChangeFeed";
import { routeApiWorkspaceSlug } from "@/server/web/http/routeApi.testkit";
import { write, writeClose } from "./issueActionGuards";

vi.mock("@/server/infra/workspaceChanges/workspaceChangeFeed", () => ({
  checkWorkspaceChangesNow: vi.fn<typeof checkWorkspaceChangesNow>(),
}));
vi.mock("@/server/web/locale/requestLocale", () => ({ requestLocale: async () => "ko" }));

const runWrite = vi.fn<(cwd: string) => Promise<BdOutcome<null>>>();
const runClose = vi.fn<(cwd: string) => Promise<CloseOutcome>>();

const rejections: [string, unknown, string][] = [
  [
    "등록하지 않은 이름",
    "other",
    "등록되지 않은 workspace입니다: other. 그 디렉터리에서 bd-desk start를 실행해 등록해 주세요.",
  ],
  ["문자열이 아닌 이름", 1, "요청 형식이 올바르지 않습니다."],
];

describe("write", () => {
  test("등록한 workspace 이름이면 그 디렉터리에서 bd 쓰기를 실행한다", async () => {
    runWrite.mockResolvedValue({ ok: true, value: null });

    const result = await write(routeApiWorkspaceSlug, runWrite);

    expect(runWrite).toHaveBeenCalledWith("/workspace");
    expect(result).toEqual({ ok: true, data: null });
  });

  test.each(rejections)(
    "%s은 bd 쓰기를 실행하지 않고 거부한다",
    async (_case, workspace, error) => {
      const result = await write(workspace, runWrite);

      expect(runWrite).not.toHaveBeenCalled();
      expect(checkWorkspaceChangesNow).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: false, error });
    },
  );
});

describe("writeClose", () => {
  test("등록한 workspace 이름이면 그 디렉터리에서 닫기를 실행한다", async () => {
    runClose.mockResolvedValue({ ok: true, value: [] });

    const result = await writeClose(routeApiWorkspaceSlug, runClose);

    expect(runClose).toHaveBeenCalledWith("/workspace");
    expect(result).toEqual({ ok: true, data: [] });
  });

  test.each(rejections)("%s은 닫기를 실행하지 않고 거부한다", async (_case, workspace, error) => {
    const result = await writeClose(workspace, runClose);

    expect(runClose).not.toHaveBeenCalled();
    expect(checkWorkspaceChangesNow).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error });
  });
});
