import { boardIssues } from "@beads-desk/bd";
import { expect, test, vi } from "vitest";
import {
  expectRouteBdError,
  expectRouteData,
  routeApiRequest,
} from "@/server/web/http/routeApi.testkit";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { handleBoardRequest } from "./boardRouteApi";

vi.mock("@beads-desk/bd", () => ({ boardIssues: vi.fn<typeof boardIssues>() }));

test("workspace의 board 열 구성을 돌려준다", async () => {
  const items = [{ column: "ready" as const, issue: issue("demo-1") }];
  vi.mocked(boardIssues).mockResolvedValue({ ok: true, value: items });

  const response = await handleBoardRequest(routeApiRequest());

  expect(boardIssues).toHaveBeenCalledWith("/workspace");
  await expectRouteData(response, items);
});

test("bd가 실패하면 bd의 메시지를 오류로 돌려준다", async () => {
  vi.mocked(boardIssues).mockResolvedValue({
    ok: false,
    error: { message: "boom\n", exitCode: 1 },
  });

  await expectRouteBdError(await handleBoardRequest(routeApiRequest()), "boom");
});
