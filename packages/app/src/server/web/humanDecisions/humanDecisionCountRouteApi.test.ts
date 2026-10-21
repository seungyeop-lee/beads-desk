import { humanDecisionIssues } from "@beads-desk/bd";
import { expect, test, vi } from "vitest";
import {
  expectRouteBdError,
  expectRouteData,
  routeApiRequest,
} from "@/server/web/http/routeApi.testkit";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { handleHumanDecisionCountRequest } from "./humanDecisionCountRouteApi";

vi.mock("@beads-desk/bd", () => ({
  humanDecisionIssues: vi.fn<typeof humanDecisionIssues>(),
}));

test("workspace의 열린 human gate와 판단을 기다리는 이슈를 더한 개수를 돌려준다", async () => {
  vi.mocked(humanDecisionIssues).mockResolvedValue({
    ok: true,
    value: {
      gates: [issue("g-1")],
      labeled: [
        issue("q-1", { status: "open", labels: ["human"] }),
        issue("q-2", { status: "closed", labels: ["human"] }),
      ],
    },
  });

  const response = await handleHumanDecisionCountRequest(routeApiRequest());

  expect(humanDecisionIssues).toHaveBeenCalledWith("/workspace");
  await expectRouteData(response, 2);
});

test("bd가 실패하면 bd의 메시지를 오류로 돌려준다", async () => {
  vi.mocked(humanDecisionIssues).mockResolvedValue({
    ok: false,
    error: { message: "boom\n", exitCode: 1 },
  });

  await expectRouteBdError(await handleHumanDecisionCountRequest(routeApiRequest()), "boom");
});
