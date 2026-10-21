import { openGates } from "@beads-desk/bd";
import { expect, test, vi } from "vitest";
import {
  expectRouteBdError,
  expectRouteData,
  routeApiRequest,
} from "@/server/web/http/routeApi.testkit";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { handleOpenGatesRequest } from "./gatesRouteApi";

vi.mock("@beads-desk/bd", () => ({ openGates: vi.fn<typeof openGates>() }));

test("workspace의 닫히지 않은 gate를 돌려준다", async () => {
  const gates = [issue("g-1", { issueType: "gate", awaitType: "timer" })];
  vi.mocked(openGates).mockResolvedValue({ ok: true, value: gates });

  const response = await handleOpenGatesRequest(routeApiRequest());

  expect(openGates).toHaveBeenCalledWith("/workspace");
  await expectRouteData(response, gates);
});

test("gate 조회가 실패하면 bd의 메시지를 오류로 돌려준다", async () => {
  vi.mocked(openGates).mockResolvedValue({ ok: false, error: { message: "boom\n", exitCode: 1 } });

  await expectRouteBdError(await handleOpenGatesRequest(routeApiRequest()), "boom");
});
