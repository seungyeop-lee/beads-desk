import { epicStatuses, type EpicStatus, type Issue } from "@beads-desk/bd";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { handleEpicsRequest } from "./epicsRouteApi";

vi.mock("@beads-desk/bd", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@beads-desk/bd")>()),
  epicStatuses: vi.fn<typeof epicStatuses>(),
}));

const originalWorkspace = process.env.BEADS_DESK_WORKSPACE;

beforeEach(() => {
  process.env.BEADS_DESK_WORKSPACE = "/workspace";
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
