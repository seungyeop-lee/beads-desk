import { epicStatuses, type EpicStatus } from "@beads-desk/bd";
import { expect, test, vi } from "vitest";
import { expectRouteData, routeApiRequest } from "@/server/web/http/routeApi.testkit";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { handleEpicsRequest } from "./epicsRouteApi";

vi.mock("@beads-desk/bd", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@beads-desk/bd")>()),
  epicStatuses: vi.fn<typeof epicStatuses>(),
}));

test("workspace의 epic 진행 현황을 돌려준다", async () => {
  const epics = [
    { epic: issue("e-1"), totalChildren: 2, closedChildren: 1, inProgressChildren: 0 },
  ] satisfies EpicStatus[];
  vi.mocked(epicStatuses).mockResolvedValue({ ok: true, value: epics });

  const response = await handleEpicsRequest(routeApiRequest());

  expect(epicStatuses).toHaveBeenCalledWith("/workspace");
  await expectRouteData(response, epics);
});
