import {
  epicStatuses,
  listIssues,
  withWorkSignals,
  type EpicStatus,
  type Issue,
} from "@beads-desk/bd";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { handleEpicDescendantsRequest, handleEpicsRequest } from "./epicsRouteApi";

vi.mock("@beads-desk/bd", async (importOriginal) => ({
  epicDescendants: (await importOriginal<typeof import("@beads-desk/bd")>()).epicDescendants,
  epicStatuses: vi.fn<typeof epicStatuses>(),
  listIssues: vi.fn<typeof listIssues>(),
  withWorkSignals: vi.fn<typeof withWorkSignals>(),
}));

const originalWorkspace = process.env.BEADS_DESK_WORKSPACE;

beforeEach(() => {
  process.env.BEADS_DESK_WORKSPACE = "/workspace";
  vi.mocked(withWorkSignals).mockImplementation((_cwd, listing) => listing);
});

afterEach(() => {
  process.env.BEADS_DESK_WORKSPACE = originalWorkspace;
  vi.resetAllMocks();
});

test("workspace의 epic 진행 현황을 돌려준다", async () => {
  const epics = [
    { epic: { id: "e-1" } as Issue, totalChildren: 2, closedChildren: 1 },
  ] satisfies EpicStatus[];
  vi.mocked(epicStatuses).mockResolvedValue({ ok: true, value: epics });

  const response = await handleEpicsRequest();

  expect(epicStatuses).toHaveBeenCalledWith("/workspace");
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({ ok: true, data: epics });
});

test("epic의 후손 이슈와 에픽 밖에서 기다리는 이슈까지 센 후손 이슈의 대기 수를 돌려준다", async () => {
  const issues = [
    { id: "e-1", status: "open" },
    { id: "e-1.1", status: "open", parent: "e-1" },
    { id: "e-1.2", status: "open", parent: "e-1", blockedBy: ["e-1.1"] },
    { id: "outside", status: "open", blockedBy: ["e-1.2"] },
    { id: "blocker", status: "open" },
    { id: "e-1.3", status: "open", parent: "e-1", blockedBy: ["blocker"] },
  ] as Issue[];
  vi.mocked(listIssues).mockResolvedValue({ ok: true, value: issues });

  const response = await handleEpicDescendantsRequest("e-1");

  expect(listIssues).toHaveBeenCalledWith("/workspace", []);
  expect(withWorkSignals).toHaveBeenCalledWith("/workspace", expect.any(Promise));
  const body = await response.json();
  expect(body.data.issues.map((issue: Issue) => issue.id)).toEqual(["e-1.1", "e-1.2", "e-1.3"]);
  expect(body.data.waiters).toEqual({ "e-1.1": 2, "e-1.2": 1 });
});

test("이슈 목록을 읽지 못하면 bd의 메시지를 오류로 돌려준다", async () => {
  vi.mocked(listIssues).mockResolvedValue({
    ok: false,
    error: { message: "boom\n", exitCode: 1 },
  });

  const response = await handleEpicDescendantsRequest("e-1");

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ ok: false, error: "boom" });
});
