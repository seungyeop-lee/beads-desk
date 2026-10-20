import { decisionRecords, type DecisionRecord } from "@beads-desk/bd";
import { expect, test, vi } from "vitest";
import {
  expectRouteBdError,
  expectRouteData,
  routeApiRequest,
} from "@/server/web/http/routeApiTest";
import { issue } from "@/shared/domain/issues/issueFixture";
import { handleDecisionsRequest } from "./decisionsRouteApi";

vi.mock("@beads-desk/bd", () => ({
  decisionRecords: vi.fn<typeof decisionRecords>(),
}));

test("workspace의 decision과 대체 관계를 돌려준다", async () => {
  const decisions = [{ decision: issue("d-1"), supersededBy: "d-2" }] satisfies DecisionRecord[];
  vi.mocked(decisionRecords).mockResolvedValue({ ok: true, value: decisions });

  const response = await handleDecisionsRequest(routeApiRequest());

  expect(decisionRecords).toHaveBeenCalledWith("/workspace");
  await expectRouteData(response, decisions);
});

test("bd가 실패하면 bd의 메시지를 오류로 돌려준다", async () => {
  vi.mocked(decisionRecords).mockResolvedValue({
    ok: false,
    error: { message: "boom\n", exitCode: 1 },
  });

  await expectRouteBdError(await handleDecisionsRequest(routeApiRequest()), "boom");
});
