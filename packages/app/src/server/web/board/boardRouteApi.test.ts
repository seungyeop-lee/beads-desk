import { listIssues } from "@beads-desk/bd";
import { expect, test, vi } from "vitest";
import {
  expectRouteBdError,
  expectRouteData,
  routeApiRequest,
} from "@/server/web/http/routeApi.testkit";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { handleBoardRequest } from "./boardRouteApi";

vi.mock("@beads-desk/bd", () => ({ listIssues: vi.fn<typeof listIssues>() }));

test("workspace의 board 열 구성을 돌려준다", async () => {
  const listed = [issue("demo-1", { status: "open", ready: true })];
  vi.mocked(listIssues).mockResolvedValue({ ok: true, value: listed });

  const response = await handleBoardRequest(routeApiRequest());

  expect(listIssues).toHaveBeenCalledWith("/workspace", []);
  await expectRouteData(response, [{ column: "ready", issue: listed[0]! }]);
});

test("bd가 실패하면 bd의 메시지를 오류로 돌려준다", async () => {
  vi.mocked(listIssues).mockResolvedValue({
    ok: false,
    error: { message: "boom\n", exitCode: 1 },
  });

  await expectRouteBdError(await handleBoardRequest(routeApiRequest()), "boom");
});
