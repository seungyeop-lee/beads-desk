import { listIssues } from "@beads-desk/bd";
import { expect, test, vi } from "vitest";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { readEpicDescendants } from "./epicDescendants";

vi.mock("@beads-desk/bd", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@beads-desk/bd")>()),
  listIssues: vi.fn<typeof listIssues>(),
}));

test("epic의 후손 이슈와 에픽 밖에서 기다리는 이슈까지 센 후손 이슈의 대기 수를 조립한다", async () => {
  const issues = [
    issue("e-1"),
    issue("e-1.1", { parent: "e-1" }),
    issue("e-1.2", { parent: "e-1", blockedBy: ["e-1.1"] }),
    issue("outside", { blockedBy: ["e-1.2"] }),
    issue("blocker"),
    issue("e-1.3", { parent: "e-1", blockedBy: ["blocker"] }),
  ];
  vi.mocked(listIssues).mockResolvedValue({ ok: true, value: issues });

  const result = await readEpicDescendants("/workspace", "e-1");

  expect(listIssues).toHaveBeenCalledWith("/workspace", []);
  expect(result).toEqual({
    ok: true,
    value: {
      issues: issues.filter(({ parent }) => parent === "e-1"),
      waiters: { "e-1.1": 2, "e-1.2": 1 },
    },
  });
});

test("이슈 목록을 읽지 못하면 bd의 오류를 그대로 돌려준다", async () => {
  vi.mocked(listIssues).mockResolvedValue({
    ok: false,
    error: { message: "boom\n", exitCode: 1 },
  });

  const result = await readEpicDescendants("/workspace", "e-1");

  expect(result).toEqual({ ok: false, error: { message: "boom\n", exitCode: 1 } });
});
