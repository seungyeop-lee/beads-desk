import {
  duplicateCandidates,
  epicStatuses,
  lintFindings,
  orphanIssues,
  type IssueRef,
} from "@beads-desk/bd";
import { beforeEach, expect, test, vi } from "vitest";
import { issue } from "@/shared/domain/issues/issueFixture";
import { readHygieneReport } from "./hygieneReport";

vi.mock("@beads-desk/bd", () => ({
  orphanIssues: vi.fn<typeof orphanIssues>(),
  lintFindings: vi.fn<typeof lintFindings>(),
  duplicateCandidates: vi.fn<typeof duplicateCandidates>(),
  epicStatuses: vi.fn<typeof epicStatuses>(),
}));

beforeEach(() => {
  vi.mocked(orphanIssues).mockResolvedValue({ ok: true, value: [] });
  vi.mocked(lintFindings).mockResolvedValue({ ok: true, value: [] });
  vi.mocked(duplicateCandidates).mockResolvedValue({ ok: true, value: [] });
  vi.mocked(epicStatuses).mockResolvedValue({ ok: true, value: [] });
});

function epic(id: string, totalChildren: number, closedChildren: number) {
  return { epic: issue(id), totalChildren, closedChildren };
}

test("기준 일수와 관계없는 점검 결과를 모아 조립하고, 에픽은 하위 이슈가 모두 닫힌 것만 담는다", async () => {
  const duplicates: [IssueRef, IssueRef][] = [
    [
      { id: "t-2", title: "a" },
      { id: "t-3", title: "a" },
    ],
  ];
  vi.mocked(duplicateCandidates).mockResolvedValue({ ok: true, value: duplicates });
  const epics = [epic("e-done", 2, 2), epic("e-partly", 2, 1)];
  vi.mocked(epicStatuses).mockResolvedValue({ ok: true, value: epics });

  const result = await readHygieneReport("/workspace");

  expect(result).toEqual({
    ok: true,
    value: {
      orphans: [],
      lint: [],
      duplicates,
      closableEpics: [epics[0].epic],
    },
  });
});

test("점검 하나라도 실패하면 그 오류를 돌려준다", async () => {
  vi.mocked(lintFindings).mockResolvedValue({
    ok: false,
    error: { message: "boom\n", exitCode: 1 },
  });

  const result = await readHygieneReport("/workspace");

  expect(result).toEqual({ ok: false, error: { message: "boom\n", exitCode: 1 } });
});
