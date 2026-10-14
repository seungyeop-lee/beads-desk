import {
  epicChildren,
  epicStatuses,
  withWorkSignals,
  type EpicStatus,
  type Issue,
} from "@beads-desk/bd";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { handleEpicChildrenRequest, handleEpicsRequest } from "./epicsRouteApi";

vi.mock("@beads-desk/bd", () => ({
  epicChildren: vi.fn<typeof epicChildren>(),
  epicStatuses: vi.fn<typeof epicStatuses>(),
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

test("epic의 하위 이슈를 돌려주고, 실패하면 bd의 메시지를 오류로 돌려준다", async () => {
  vi.mocked(epicChildren)
    .mockResolvedValueOnce({ ok: true, value: [{ id: "e-1.1" } as Issue] })
    .mockResolvedValueOnce({ ok: false, error: { message: "boom\n", exitCode: 1 } });

  const found = await handleEpicChildrenRequest("e-1");
  const failed = await handleEpicChildrenRequest("e-2");

  expect(epicChildren).toHaveBeenCalledWith("/workspace", "e-1");
  expect(withWorkSignals).toHaveBeenCalledWith("/workspace", expect.any(Promise));
  expect(await found.json()).toEqual({ ok: true, data: [{ id: "e-1.1" }] });
  expect(failed.status).toBe(500);
  expect(await failed.json()).toEqual({ ok: false, error: "boom" });
});
